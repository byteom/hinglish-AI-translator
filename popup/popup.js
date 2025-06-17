document.addEventListener('DOMContentLoaded', async () => {
  // Theme toggle logic
  const themeToggleBtn = document.getElementById('themeToggle');

  // Apply saved theme
  const { themeMode } = await chrome.storage.local.get('themeMode');
  if (themeMode === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.textContent = '☀️';
  } else {
    themeToggleBtn.textContent = '🌙';
  }

  // Toggle theme on button click
  themeToggleBtn.addEventListener('click', async () => {
    const isDark = document.body.classList.toggle('dark-mode');
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    await chrome.storage.local.set({ themeMode: isDark ? 'dark' : 'light' });
  });

  // Get DOM elements
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const toggleApiKey = document.getElementById('toggleApiKey');
  const saveApiKey = document.getElementById('saveApiKey');
  const changeApiKey = document.getElementById('changeApiKey');
  const removeApiKey = document.getElementById('removeApiKey');
  const translationStyle = document.getElementById('translationStyle');
  const languageLevel = document.getElementById('languageLevel');
  const saveSettings = document.getElementById('saveSettings');

  // Check if API key exists
  const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
  if (!groqApiKey) {
    window.location.href = 'welcome.html';
    return;
  }

  // Show API key is configured
  apiKeyStatus.textContent = '✓ API Key Configured';
  apiKeyStatus.style.color = '#4CAF50';

  // Load existing translation settings
  const { translationSettings } = await chrome.storage.local.get('translationSettings');
  if (translationSettings) {
    translationStyle.value = translationSettings.style || 'hinglish';
    languageLevel.value = translationSettings.level || 'balanced';
  }

  // Toggle API key visibility
  toggleApiKey.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleApiKey.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      toggleApiKey.textContent = '👁️';
    }
  });

  // Save API key
  saveApiKey.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showError('Please enter your API key');
      return;
    }

    try {
      await chrome.storage.local.set({ groqApiKey: apiKey });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: [{
            role: "system",
            content: "You are a helpful assistant."
          }, {
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

      showSuccess('API key saved successfully');
      apiKeyInput.value = '';
      apiKeyContainer.style.display = 'none';
      apiKeyStatus.textContent = '✓ API Key Configured';
      apiKeyStatus.style.color = '#4CAF50';
    } catch (error) {
      console.error('API key validation error:', error);
      await chrome.storage.local.remove('groqApiKey');
      showError(error.message || 'Failed to validate API key');
    }
  });

  // Change API key
  changeApiKey.addEventListener('click', () => {
    apiKeyContainer.style.display = 'block';
  });

  // Remove API key
  removeApiKey.addEventListener('click', async () => {
    try {
      await chrome.storage.local.remove('groqApiKey');
      window.location.href = 'welcome.html';
    } catch (error) {
      console.error('Error removing API key:', error);
      showError('Failed to remove API key');
    }
  });

  // Save translation settings
  saveSettings.addEventListener('click', async () => {
    try {
      const settings = {
        style: translationStyle.value,
        level: languageLevel.value
      };
      await chrome.storage.local.set({ translationSettings: settings });
      showSuccess('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save settings');
    }
  });
});

// Function to show success message
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Function to show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}
