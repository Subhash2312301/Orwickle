// Orwickle Dealroom Dossier — Interactive Controller

function switchScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.device-screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.ribbon-tab').forEach(t => t.classList.remove('active'));

  const screenElem = document.getElementById(`screen-${screenId}`);
  const tabElem = document.getElementById(`tab-btn-${screenId}`);

  if (screenElem) screenElem.classList.add('active');
  if (tabElem) tabElem.classList.add('active');

  // Adjust theme context for dashboard
  if (screenId === 'dashboard') {
    document.body.setAttribute('data-theme', 'dark');
    document.getElementById('theme-label').innerText = 'NIGHT LEDGER';
  } else {
    document.body.setAttribute('data-theme', 'light');
    document.getElementById('theme-label').innerText = 'PAPER';
  }
}

function selectRole(element, role) {
  document.querySelectorAll('.dossier-card').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', next);
  document.getElementById('theme-label').innerText = next === 'light' ? 'PAPER' : 'NIGHT LEDGER';
}

// Live Countdown Simulation
let secondsRemaining = 582; // 09:42
setInterval(() => {
  if (secondsRemaining > 0) {
    secondsRemaining--;
    const mins = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
    const secs = (secondsRemaining % 60).toString().padStart(2, '0');
    const timerElem = document.getElementById('countdown-timer');
    if (timerElem) {
      timerElem.innerText = `${mins}:${secs} REMAINING`;
    }
  }
}, 1000);
