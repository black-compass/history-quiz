// account.js — logica della pagina Account
// Dipende da auth.js già caricato (usa l'istanza "sb" e currentUser da lì)

// URL della Edge Function per la cancellazione account (task 2)
const DELETE_ACCOUNT_FUNCTION_URL = 'https://qjqcakgyxnzinavyjyvt.supabase.co/functions/v1/delete-account';

// ── Riconoscimento modalità: pagina normale o link di recovery email ──
function isRecoveryMode() {
  // Supabase mette i parametri nell'hash dell'URL, es:
  // #access_token=...&type=recovery&...
  const hash = window.location.hash;
  return hash.includes('type=recovery');
}

function initAccountPage() {
  if (isRecoveryMode()) {
    document.getElementById('recovery-section').style.display = 'block';
    document.getElementById('account-main-section').style.display = 'none';
    return;
  }

  // Modalità normale: serve essere loggati
  sb.auth.getSession().then(({ data }) => {
    if (!data.session) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = data.session.user;
    document.getElementById('account-email-display').textContent = currentUser.email;
    document.getElementById('account-main-section').style.display = 'block';
    document.getElementById('recovery-section').style.display = 'none';
    loadCurrentUsername();
  });
}

// ── 0. Cambio username ──
async function loadCurrentUsername() {
  const { data: profile, error } = await sb
    .from('profiles')
    .select('username')
    .eq('id', currentUser.id)
    .single();

  if (!error && profile) {
    document.getElementById('current-username-display').textContent = profile.username;
    document.getElementById('new-username').value = profile.username;
  }
}

function isValidUsername(username) {
  // 3-20 caratteri, solo lettere, cifre e underscore — niente spazi o
  // caratteri che potrebbero creare problemi se mostrati in classifica.
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

async function changeUsername() {
  const newUsername = document.getElementById('new-username').value.trim();
  const errorEl = document.getElementById('change-username-error');
  const successEl = document.getElementById('change-username-success');

  errorEl.textContent = '';
  successEl.textContent = '';

  if (!isValidUsername(newUsername)) {
    errorEl.textContent = 'Lo username deve avere 3-20 caratteri: lettere, numeri o underscore, senza spazi.';
    return;
  }

  const { error } = await sb
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', currentUser.id);

  if (error) {
    // 23505 = unique_violation: username già in uso da un altro account.
    if (error.code === '23505') {
      errorEl.textContent = 'Questo username è già in uso, scegline un altro.';
    } else {
      errorEl.textContent = error.message;
    }
    return;
  }

  document.getElementById('current-username-display').textContent = newUsername;
  successEl.textContent = 'Username aggiornato con successo.';
}

// ── 1. Cambio password diretto (richiede vecchia password) ──
async function changePassword() {
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  const errorEl = document.getElementById('change-password-error');
  const successEl = document.getElementById('change-password-success');

  errorEl.textContent = '';
  successEl.textContent = '';

  if (!oldPassword || !newPassword) {
    errorEl.textContent = 'Inserisci sia la vecchia che la nuova password.';
    return;
  }

  // Verifica la vecchia password con un re-login silenzioso
  const { error: verifyError } = await sb.auth.signInWithPassword({
    email: currentUser.email,
    password: oldPassword
  });

  if (verifyError) {
    errorEl.textContent = 'Vecchia password non corretta.';
    return;
  }

  // Verifica passata, procedo con l'aggiornamento
  const { error: updateError } = await sb.auth.updateUser({ password: newPassword });

  if (updateError) {
    errorEl.textContent = updateError.message;
    return;
  }

  document.getElementById('old-password').value = '';
  document.getElementById('new-password').value = '';
  successEl.textContent = 'Password aggiornata con successo.';
}

// ── 2. Reset password via email ──
async function sendResetEmail() {
  const errorEl = document.getElementById('reset-email-error');
  const successEl = document.getElementById('reset-email-success');

  errorEl.textContent = '';
  successEl.textContent = '';

  const { error } = await sb.auth.resetPasswordForEmail(currentUser.email, {
    redirectTo: window.location.origin + window.location.pathname.replace('account.html', 'account.html')
  });

  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  successEl.textContent = 'Email di reset inviata a ' + currentUser.email + '.';
}

// ── 2b. Impostazione nuova password da link di recovery ──
async function setNewPasswordFromRecovery() {
  const newPassword = document.getElementById('recovery-new-password').value;
  const errorEl = document.getElementById('recovery-error');
  const successEl = document.getElementById('recovery-success');

  errorEl.textContent = '';
  successEl.textContent = '';

  if (!newPassword) {
    errorEl.textContent = 'Inserisci la nuova password.';
    return;
  }

  const { error } = await sb.auth.updateUser({ password: newPassword });

  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  successEl.textContent = 'Password impostata. Ora puoi accedere normalmente.';
  document.getElementById('recovery-new-password').value = '';
}

// ── 3. Cancellazione account ──
function showDeleteConfirm() {
  document.getElementById('delete-account-btn').style.display = 'none';
  document.getElementById('delete-confirm').style.display = 'inline';
}

function hideDeleteConfirm() {
  document.getElementById('delete-account-btn').style.display = 'inline';
  document.getElementById('delete-confirm').style.display = 'none';
}

async function deleteAccount() {
  const errorEl = document.getElementById('delete-error');
  errorEl.textContent = '';

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) {
    errorEl.textContent = 'Sessione non valida, effettua di nuovo il login.';
    return;
  }

  try {
    const response = await fetch(DELETE_ACCOUNT_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + sessionData.session.access_token,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      errorEl.textContent = result.error || 'Errore durante la cancellazione.';
      return;
    }

    // Cancellazione riuscita: pulizia sessione locale e redirect
    await sb.auth.signOut();
    window.location.href = 'index.html';
  } catch (err) {
    errorEl.textContent = 'Errore di rete. Riprova.';
  }
}

initAccountPage();
