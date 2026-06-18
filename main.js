let currentIndex = 0;
let score = 0;
let answered = false;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getPoints(level, correct) {
  if (correct) {
    return level;       // +1 / +2 / +3
  } else {
    if (level === 1) return -2;
    if (level === 2) return -1;
    if (level === 3) return -1;
  }
}

function renderQuestion() {
  const q = shuffledQuestions[currentIndex];

  document.getElementById('question-text').textContent = q.text;

  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';

  q.options.forEach(function(option, index) {
    const btn = document.createElement('button');
    btn.textContent = option;
    btn.onclick = function() { answer(index); };
    optionsDiv.appendChild(btn);
  });

  answered = false;
  document.getElementById('feedback-area').textContent = '';
  document.getElementById('next-btn').style.display = 'none';
}

function answer(index) {
  if (answered) return;
  answered = true;

  const q = shuffledQuestions[currentIndex];
  const buttons = document.querySelectorAll('#options button');
  const correct = index === q.correct;
  const delta = getPoints(q.level, correct);
  score += delta;

  if (correct) {
    buttons[index].style.fontWeight = 'bold';
    document.getElementById('feedback-area').textContent = 'Correct! +' + delta;
  } else {
    buttons[index].style.textDecoration = 'line-through';
    buttons[q.correct].style.fontWeight = 'bold';
    document.getElementById('feedback-area').textContent = 'Wrong! ' + delta;
  }

  document.getElementById('score-display').textContent = 'Score: ' + score;
  document.getElementById('next-btn').style.display = 'block';

  buttons.forEach(function(btn) { btn.disabled = true; });

  saveScore();
}

function nextQuestion() {
  currentIndex++;

  if (currentIndex < shuffledQuestions.length) {
    renderQuestion();
  } else {
    document.getElementById('question-card').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('feedback-area').textContent = 'Quiz completed! Final score: ' + score;
    document.getElementById('restart-btn').style.display = 'block';
  }
}

function restart() {
  currentIndex = 0;
  score = 0;
  answered = false;

  document.getElementById('question-card').style.display = 'block';
  document.getElementById('restart-btn').style.display = 'none';
  document.getElementById('score-display').textContent = 'Score: 0';

  renderQuestion();
}

const shuffledQuestions = shuffle([...questions]);
document.getElementById('next-btn').onclick = nextQuestion;
document.getElementById('restart-btn').onclick = restart;