// supabase/functions/delete-account/index.ts
//
// Cancella in modo permanente l'utente autenticato che chiama questa funzione:
// rimuove la riga in `profiles` (via on delete cascade) e l'utente da auth.users.
//
// Sicurezza:
// - Verifica SEMPRE l'identità tramite il token JWT ricevuto nell'header
//   Authorization, usando la chiave ANON (non la service_role) per questo passo.
// - Usa la SERVICE_ROLE key solo per l'operazione admin.deleteUser, e solo
//   DOPO aver verificato chi è l'utente — non si fida mai di un id passato
//   dal client nel body della richiesta.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers CORS: servono perché la richiesta arriva dal browser (account.js)
// su un'origine diversa da quella della funzione.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  // Risposta alla preflight CORS del browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }

  // SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono fornite automaticamente da
  // Supabase ad ogni Edge Function: non vanno (e non possono) essere impostate
  // a mano coi secrets, perché il prefisso "SUPABASE_" è riservato dalla CLI.
  // PROJECT_ANON_KEY invece è un secret "nostro", va impostato manualmente
  // con `supabase secrets set PROJECT_ANON_KEY=...`.
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SUPABASE_ANON_KEY = Deno.env.get('PROJECT_ANON_KEY') ?? ''
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  try {
    // 1. Client "normale" (anon key), con il token dell'utente nell'header.
    //    Serve solo a verificare CHI sta chiamando — non ha privilegi admin.
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401)
    }

    // 2. Client admin (service_role key), usato SOLO ora che sappiamo
    //    con certezza quale utente è autenticato.
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 3. Cancella la riga profilo. Non è strettamente necessario se la tabella
    //    ha "on delete cascade" su auth.users (come nel nostro schema), ma lo
    //    facciamo esplicitamente per chiarezza e per non dipendere in modo
    //    silenzioso dal comportamento del database.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error('Errore cancellazione profilo:', profileError.message)
      return jsonResponse({ error: 'Could not delete profile data' }, 500)
    }

    // 4. Cancella l'utente da Supabase Auth. Richiede la service_role key.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Errore cancellazione utente:', deleteError.message)
      return jsonResponse({ error: 'Could not delete user account' }, 500)
    }

    return jsonResponse({ success: true }, 200)
  } catch (err) {
    console.error('Errore inatteso:', err)
    return jsonResponse({ error: 'Unexpected server error' }, 500)
  }
})
