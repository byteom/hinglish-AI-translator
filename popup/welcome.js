document.addEventListener('DOMContentLoaded', async () => {
  const { groqApiKey } = await chrome.storage.local.get(['groqApiKey']);
  if (groqApiKey) {
    window.location.href = 'popup.html';
    return;
  }

  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveApiKey');
  const messageBox = document.createElement('div');
  messageBox.style.marginTop = '10px';
  messageBox.style.fontSize = '14px';
  document.querySelector('.setup').appendChild(messageBox);

  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showMessage('Please enter your API key.', 'error');
      return;
    }

    saveButton.disabled = true;
    apiKeyInput.disabled = true;
    showMessage('Validating API key...', 'info');

    try {
      await chrome.storage.local.set({ groqApiKey: apiKey });

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

      showMessage('API key validated successfully! Redirecting...', 'success');
      setTimeout(() => (window.location.href = 'popup.html'), 1000);
    } catch (error) {
      console.error('API key error:', error);
      await chrome.storage.local.remove(['groqApiKey']);
      showMessage(error.message || 'Invalid API key. Please try again.', 'error');
    } finally {
      saveButton.disabled = false;
      apiKeyInput.disabled = false;
    }
  });

  function showMessage(msg, type) {
    const colors = {
      success: '#0b8043',
      error: '#d93025',
      info: '#1a73e8'
    };
    messageBox.textContent = msg;
    messageBox.style.color = colors[type] || '#333';
  }
});
