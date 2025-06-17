import { preprocessInput, offlineTranslate } from "../utils/translator.js";

document.addEventListener('DOMContentLoaded', async () => {
  // Translation UI elements
  const translateBtn = document.getElementById("translate-btn");
  const explainBtn = document.getElementById("explain-btn");
  const inputText = document.getElementById("input-text");
  const toneSelect = document.getElementById("tone-select");
  const outputDiv = document.getElementById("output");
  const outputText = document.getElementById("outputText") || outputDiv;
  const copyBtn = document.getElementById("copyBtn");
  const copyMsg = document.getElementById("copyMsg");
  const clearBtn = document.getElementById("clearBtn");

  // Settings elements
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

  // Initialize UI
  apiKeyStatus.textContent = '✓ API Key Configured';
  apiKeyStatus.style.color = '#4CAF50';
  apiKeyContainer.style.display = 'none';

  // Load existing translation settings
  const { translationSettings } = await chrome.storage.local.get('translationSettings');
  if (translationSettings) {
    translationStyle.value = translationSettings.style || 'hinglish';
    languageLevel.value = translationSettings.level || 'balanced';
  }

  // Translation functions
  async function translateText(text, tone) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "translateText",
        text: text,
        tone: tone
      });
      return response || null;
    } catch (error) {
      console.error('Translation error:', error);
      return null;
    }
  }

  // Event listeners
  translateBtn?.addEventListener("click", async () => {
    let input = inputText.value.trim();
    if (!input) return;

    input = preprocessInput(input);
    const tone = toneSelect.value;

    let result = await translateText(input, tone);

    if (!result) {
      result = offlineTranslate(input) || "⚠️ Translation failed and no offline match found.";
    }

    if (outputText) {
      outputText.innerText = result;
    }
  });

  explainBtn?.addEventListener("click", async () => {
    const input = inputText.value.trim();
    if (!input) return;

    try {
      const explanation = await chrome.runtime.sendMessage({
        action: "explainText",
        text: input
      });
      
      if (outputText) {
        outputText.innerText = explanation || "Could not generate explanation";
      }
    } catch (error) {
      console.error('Explanation error:', error);
      if (outputText) {
        outputText.innerText = "Error generating explanation";
      }
    }
  });

  // Settings management
  toggleApiKey?.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleApiKey.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      toggleApiKey.textContent = '👁️';
    }
  });

  saveApiKey?.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showError('Please enter your API key');
      return;
    }

    try {
      await chrome.storage.local.set({ groqApiKey: apiKey });
      showSuccess('API key saved successfully');
      apiKeyInput.value = '';
      apiKeyContainer.style.display = 'none';
      apiKeyStatus.textContent = '✓ API Key Configured';
      apiKeyStatus.style.color = '#4CAF50';
    } catch (error) {
      console.error('Error saving API key:', error);
      showError('Failed to save API key');
    }
  });

  changeApiKey?.addEventListener('click', () => {
    apiKeyContainer.style.display = 'block';
  });

  removeApiKey?.addEventListener('click', async () => {
    try {
      await chrome.storage.local.remove('groqApiKey');
      window.location.href = 'welcome.html';
    } catch (error) {
      console.error('Error removing API key:', error);
      showError('Failed to remove API key');
    }
  });

  saveSettings?.addEventListener('click', async () => {
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

  // Utility functions
  copyBtn?.addEventListener("click", () => {
    if (outputText && outputText.textContent.trim()) {
      navigator.clipboard.writeText(outputText.textContent.trim()).then(() => {
        copyMsg.style.display = "inline";
        setTimeout(() => {
          copyMsg.style.display = "none";
        }, 1500);
      });
    }
  });

  clearBtn?.addEventListener('click', () => {
    if (outputText) {
      outputText.textContent = "";
      copyMsg.style.display = "none";
    }
  });

  function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }
});