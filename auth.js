const SUPABASE_URL = 'https://qjqcakgyxnzinavyjyvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWNha2d5eG56aW5hdnlqeXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Mzg0NzgsImV4cCI6MjA5NTQxNDQ3OH0.9fx8LVVVbDZxNmi0PkikluC6pD31KkX83s1k8qVn9Qc';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

async function signUp() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await sb.auth.signUp({ email, password });

  if (error) {
    document.getElementById('auth-error').textContent = error.message;
    return;
  }

  await sb.from('profiles').insert({ id: data.user.id, username: email });

  currentUser = data.user;
  startQuiz();
}

async function signIn() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    document.getElementById('auth-error').textContent = error.message;
    return;
  }

  currentUser = data.user;

  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (profile) {
    score = profile.score;
    document.getElementById('score-display').textContent = 'Score: ' + score;
  }

  startQuiz();
}

async function signOut() {
  await sb.auth.signOut();
  currentUser = null;
  document.getElementById('quiz-section').style.display = 'none';
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('auth-error').textContent = '';
}

function playAsGuest() {
  currentUser = null;
  startQuiz();
}

function startQuiz() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('quiz-section').style.display = 'block';
  document.getElementById('user-display').textContent = currentUser
    ? 'Logged in as: ' + currentUser.email
    : 'Playing as guest';
  document.getElementById('account-link').style.display = currentUser ? 'block' : 'none';

  renderQuestion();
}

async function saveScore() {
  if (!currentUser) return;

  await sb
    .from('profiles')
    .update({ score: score, questions_answered: currentIndex + 1 })
    .eq('id', currentUser.id);
}

// Controlla se c'è già una sessione attiva al caricamento della pagina
// (solo se startQuiz esiste: account.html non la definisce, gestisce la sessione da sé in account.js)
if (typeof startQuiz === 'function') {
  sb.auth.getSession().then(({ data }) => {
    if (data.session) {
      currentUser = data.session.user;
      startQuiz();
    }
  });
}