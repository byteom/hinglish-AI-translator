document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveApiKey');
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;

  // Check for existing API key
  const { groqApiKey } = await chrome.storage.local.get(['groqApiKey']);
  if (groqApiKey) {
    window.location.href = 'popup.html';
    return;
  }

  // Add error message element
  const errorMessage = document.createElement('div');
  errorMessage.style.color = '#d93025';
  errorMessage.style.marginTop = '10px';
  document.querySelector('.setup').appendChild(errorMessage);

  // Save API Key
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      errorMessage.textContent = 'Please enter your API key';
      return;
    }

    try {
      await chrome.storage.local.set({ groqApiKey: apiKey });

      // Validate API key
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.7,
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      // Redirect on success
      window.location.href = 'popup.html';
    } catch (error) {
      console.error('API Key validation error:', error);
      await chrome.storage.local.remove(['groqApiKey']);
      errorMessage.textContent = error.message || 'Invalid API key. Please try again.';
    }
  });

  // === Theme Toggle Setup ===
  const savedTheme = localStorage.getItem('theme') || 'light-mode';
  body.classList.add(savedTheme);
  themeToggle.textContent = savedTheme === 'dark-mode' ? '☀️' : '🌙';

  themeToggle.addEventListener('click', () => {
    const isDark = body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode', !isDark);
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark-mode' : 'light-mode');
  });
});
