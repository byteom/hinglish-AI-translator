document.addEventListener('DOMContentLoaded', async () => {
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
        // Save API key first
        await chrome.storage.local.set({ groqApiKey: apiKey });
        
        // Test the API key
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
  
    // Save settings
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
  
 // Function to show success and failure message by a single function showmessage
function showMessage(message, type = 'success') {
  let messageBox = document.getElementById('messageBox');
  if (!messageBox) {
    messageBox = document.createElement('div');
    messageBox.id = 'messageBox';
    messageBox.style.position = 'fixed';
    messageBox.style.bottom = '20px';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translateX(-50%)';
    messageBox.style.padding = '12px 20px';
    messageBox.style.borderRadius = '6px';
    messageBox.style.fontSize = '14px';
    messageBox.style.zIndex = '9999';
    messageBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    document.body.appendChild(messageBox);
  }

  messageBox.style.backgroundColor = type === 'error' ? '#d93025' : '#0b8043';
  messageBox.style.color = '#fff';
  messageBox.textContent = message;

  clearTimeout(messageBox.timeout);
  messageBox.timeout = setTimeout(() => {
    messageBox.remove();
  }, 3000);
}

function showSuccess(msg) {
  showMessage(msg, 'success');
}

function showError(msg) {
  showMessage(msg, 'error');
}
