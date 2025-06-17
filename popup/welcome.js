document.addEventListener('DOMContentLoaded', async () => {
  // Check if API key exists
  const { groqApiKey } = await chrome.storage.local.get(['groqApiKey']);
  if (groqApiKey) {
    window.location.href = 'popup.html';
    return;
  }

  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveApiKey');
  const errorMessage = document.createElement('div');
  errorMessage.style.color = '#d93025';
  errorMessage.style.marginTop = '10px';
  document.querySelector('.setup').appendChild(errorMessage);

  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      errorMessage.textContent = 'Please enter your API key';
      return;
    }

    try {
      // Save API key first
      await chrome.storage.local.set({ groqApiKey: apiKey });

      // Test the API key with a simple request
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: "Hello"
          }],
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.7,
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      // If we get here, the API key is valid
      window.location.href = 'popup.html';
    } catch (error) {
      console.error('API Key validation error:', error);
      // Remove invalid key
      await chrome.storage.local.remove(['groqApiKey']);
      errorMessage.textContent = error.message || 'Invalid API key. Please try again.';
    }
  });

  // === Theme Toggle Setup ===
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;

  let savedTheme = localStorage.getItem('theme');
  if (!savedTheme) {
    savedTheme = 'light-mode';
    localStorage.setItem('theme', savedTheme);
  }
  body.classList.add(savedTheme);
  themeToggle.textContent = savedTheme === 'dark-mode' ? '☀️' : '🌙';

  themeToggle.addEventListener('click', () => {
    if (body.classList.contains('dark-mode')) {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
      localStorage.setItem('theme', 'light-mode');
      themeToggle.textContent = '🌙';
    } else {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark-mode');
      themeToggle.textContent = '☀️';
    }
  });
});
