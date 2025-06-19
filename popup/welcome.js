const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Load saved theme from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  body.className = savedTheme;
  themeToggle.textContent = savedTheme === 'dark-mode' ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
  if (body.classList.contains('dark-mode')) {
    body.classList.replace('dark-mode', 'light-mode');
    themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light-mode');
  } else {
    body.classList.replace('light-mode', 'dark-mode');
    themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark-mode');
  }
});

// Save API key
const saveBtn = document.getElementById('saveApiKey');
const input = document.getElementById('apiKeyInput');

saveBtn.addEventListener('click', () => {
  const key = input.value.trim();
  if (key) {
    chrome.storage.local.set({ groqApiKey: key }, () => {
      alert('API key saved!');
    });
  } else {
    alert('Please enter a valid API key.');
  }
});
