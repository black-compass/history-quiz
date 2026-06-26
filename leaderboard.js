// leaderboard.js — logica della pagina Classifica
// Pagina indipendente: non richiede login, legge solo la view pubblica
// "public_leaderboard" (espone unicamente username e score, mai altri campi
// del profilo). Per questo non riusa auth.js: serve solo un client Supabase
// "anonimo" di lettura.

const SUPABASE_URL = 'https://qjqcakgyxnzinavyjyvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWNha2d5eG56aW5hdnlqeXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Mzg0NzgsImV4cCI6MjA5NTQxNDQ3OH0.9fx8LVVVbDZxNmi0PkikluC6pD31KkX83s1k8qVn9Qc';

const sbLeaderboard = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadLeaderboard() {
  const statusEl = document.getElementById('leaderboard-status');
  const tableEl = document.getElementById('leaderboard-table');
  const bodyEl = document.getElementById('leaderboard-body');

  statusEl.textContent = 'Caricamento...';

  const { data, error } = await sbLeaderboard
    .from('public_leaderboard')
    .select('username, score')
    .order('score', { ascending: false })
    .limit(100);

  if (error) {
    statusEl.textContent = 'Errore nel caricamento della classifica. Riprova più tardi.';
    return;
  }

  if (!data || data.length === 0) {
    statusEl.textContent = 'Nessun punteggio registrato ancora.';
    return;
  }

  bodyEl.innerHTML = '';
  data.forEach(function(row, index) {
    const tr = document.createElement('tr');

    const rankTd = document.createElement('td');
    rankTd.textContent = index + 1;

    const usernameTd = document.createElement('td');
    usernameTd.textContent = row.username;

    const scoreTd = document.createElement('td');
    scoreTd.textContent = row.score;

    tr.appendChild(rankTd);
    tr.appendChild(usernameTd);
    tr.appendChild(scoreTd);
    bodyEl.appendChild(tr);
  });

  statusEl.textContent = '';
  tableEl.style.display = 'block';
}

loadLeaderboard();
