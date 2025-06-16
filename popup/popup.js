// Use the background script for handling API keys to avoid CSP issues

document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const translateBtn = document.getElementById('translateBtn');
  const translateInput = document.getElementById('translateInput');
  const translateResult = document.getElementById('translateResult');
  const explainBtn = document.getElementById('explainBtn');
  const explainInput = document.getElementById('explainInput');
  const explainResult = document.getElementById('explainResult');
  const translatePageBtn = document.getElementById('translatePageBtn');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  const changeApiKeyBtn = document.getElementById('changeApiKey');
  const removeApiKeyBtn = document.getElementById('removeApiKey');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const translationStyle = document.getElementById('translationStyle');
  const languageLevel = document.getElementById('languageLevel');
  const translationMode = document.getElementById('translationMode');
  const sessionOnlyCheckbox = document.getElementById('sessionOnly');
  const apiUsageCount = document.getElementById('apiCallCount'); // Match the ID in HTML
  const apiUsageStatus = document.getElementById('lastApiStatus'); // Match the ID in HTML
  const resetApiCountBtn = document.getElementById('resetCounter'); // Match the ID in HTML

  // Helper function to show loading state on buttons
  function setButtonLoading(button, isLoading, originalText) {
    if (isLoading) {
      button.disabled = true;
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      button.setAttribute('data-original-text', button.textContent);
      button.textContent = ' ' + originalText;
      button.prepend(spinner);
    } else {
      button.disabled = false;
      button.textContent = button.getAttribute('data-original-text') || originalText;
    }
  }

  // Helper function for showing messages
  function showMessage(message, isError = false) {
    const messageElement = document.createElement('div');
    messageElement.className = isError ? 'error-message' : 'success-message';
    messageElement.textContent = message;
    
    // Remove any existing messages
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
    
    // Add the new message at the top of the container
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(messageElement, container.firstChild);
      
      // Auto-remove after 4 seconds
      setTimeout(() => messageElement.remove(), 4000);
    }
  }
  // Check if API key exists
  let apiKeyExists = false;
  chrome.runtime.sendMessage({action: "checkApiKey"}, (response) => {
    apiKeyExists = response.hasKey;
    if (apiKeyExists) {
      const storageTypeText = response.storageType === 'session' ? 
        "API key configured (Session only)" : 
        "API key configured";
      apiKeyStatus.textContent = storageTypeText;
      apiKeyStatus.style.backgroundColor = "#0b8043";
      
      // Set the checkbox to match stored preference if editing API key
      if (sessionOnlyCheckbox) {
        sessionOnlyCheckbox.checked = response.storageType === 'session';
      }
    } else {
      apiKeyStatus.textContent = "No API key configured";
      apiKeyStatus.style.backgroundColor = "#d93025";
    }
  });

  // Load API usage stats
  function updateApiUsageStats() {
    chrome.runtime.sendMessage({action: "getApiUsage"}, (stats) => {
      if (stats && apiUsageCount) {
        apiUsageCount.textContent = `${stats.callCount || 0} calls`;
          if (stats.lastStatus && apiUsageStatus) {
          let statusColor = "#1a73e8"; // Default blue
          let statusText = stats.lastStatus || "Unknown";
          
          // Convert status to more user-friendly text
          if (stats.lastStatus === "success") {
            statusColor = "#0b8043"; // Green
            statusText = "Success";
          } else if (stats.lastStatus === "failed") {
            statusColor = "#d93025"; // Red
            statusText = "Failed";
          } else if (stats.lastStatus === "retrying") {
            statusColor = "#f29900"; // Orange
            statusText = "Retrying...";
          }
          
          apiUsageStatus.textContent = statusText;
          apiUsageStatus.style.color = statusColor;
        }
      }
    });
  }
  
  // Initialize UI and load saved settings
  async function initializeUI() {
    // Load translation settings
    const settings = await chrome.storage.local.get([
      'translationStyle', 
      'languageLevel', 
      'translationMode',
      'sessionOnly'
    ]);
    
    if (settings.translationStyle && translationStyle) {
      translationStyle.value = settings.translationStyle;
    }
    
    if (settings.languageLevel && languageLevel) {
      languageLevel.value = settings.languageLevel;
    }
    
    if (settings.translationMode && translationMode) {
      translationMode.value = settings.translationMode;
    }
    
    if (settings.sessionOnly !== undefined && sessionOnlyCheckbox) {
      sessionOnlyCheckbox.checked = settings.sessionOnly;
    }
    
    updateApiUsageStats();
  }
  
  // Call initialization
  initializeUI();

  // Translation button click handler
  if (translateBtn) {
    translateBtn.addEventListener('click', async () => {
      const text = translateInput.value.trim();
      if (!text) return;
      
      setButtonLoading(translateBtn, true, "Translating...");
      
      try {
        chrome.runtime.sendMessage(
          {action: "translateText", text: text},
          (response) => {
            setButtonLoading(translateBtn, false);
            
            if (typeof response === 'string') {
              translateResult.textContent = response;
              // Update API usage stats after successful call
              updateApiUsageStats();
            } else {
              translateResult.textContent = "Error: Could not translate text";
            }
          }
        );
      } catch (error) {
        setButtonLoading(translateBtn, false);
        translateResult.textContent = "Error: " + error.message;
      }
    });
  }

  // Explain button click handler
  if (explainBtn) {
    explainBtn.addEventListener('click', async () => {
      const text = explainInput.value.trim();
      if (!text) return;
      
      setButtonLoading(explainBtn, true, "Generating explanation...");
      
      try {
        chrome.runtime.sendMessage(
          {action: "explainText", text: text},
          (response) => {
            setButtonLoading(explainBtn, false);
            
            if (typeof response === 'string') {
              explainResult.textContent = response;
              // Update API usage stats after successful call
              updateApiUsageStats();
            } else {
              explainResult.textContent = "Error: Could not generate explanation";
            }
          }
        );
      } catch (error) {
        setButtonLoading(explainBtn, false);
        explainResult.textContent = "Error: " + error.message;
      }
    });
    
    // Add keyboard shortcut (Ctrl+Enter) for explanation
    explainInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        explainBtn.click();
        e.preventDefault();
      }
    });
  }

  // Translate page button click handler
  if (translatePageBtn) {
    translatePageBtn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (tab) {
          setButtonLoading(translatePageBtn, true, "Translating...");
          
          // Send message to content script
          await chrome.tabs.sendMessage(tab.id, {action: "translatePage"});
            // Update UI
          setTimeout(() => {
            setButtonLoading(translatePageBtn, false, "Translate This Page");
            showMessage("Page translation completed!");
            // Update API usage stats
            updateApiUsageStats();
          }, 1000);
        }
      } catch (error) {        console.error("Error translating page:", error);
        setButtonLoading(translatePageBtn, false, "Translate This Page");
        showMessage("Page translation failed: " + error.message, true);
      }
    });
  }

  // Change API key button click handler
  if (changeApiKeyBtn) {    changeApiKeyBtn.addEventListener('click', () => {
      // Use the smooth transition class
      apiKeyContainer.classList.remove('hidden');
      apiKeyContainer.style.display = 'flex';
    });
  }

  // Remove API key button click handler
  if (removeApiKeyBtn) {    removeApiKeyBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to remove your API key?')) {
        setButtonLoading(removeApiKeyBtn, true, "Removing...");
        chrome.runtime.sendMessage({action: "clearApiKey"}, (response) => {
          setButtonLoading(removeApiKeyBtn, false, "Remove Key");
          if (response.success) {
            apiKeyStatus.textContent = "No API key configured";
            apiKeyStatus.style.backgroundColor = "#d93025";
            apiKeyContainer.classList.remove('hidden');
            apiKeyContainer.style.display = 'flex';
            showMessage("API key removed successfully");
          } else {
            showMessage("Failed to remove API key: " + (response.error || "Unknown error"), true);
          }
        });
      }
    });
  }

  // Save API key button click handler
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', async () => {      const apiKey = apiKeyInput.value.trim();
      
      if (!apiKey) {
        showMessage("Please enter an API key", true);
        return;
      }
      
      // Simple validation
      if (!apiKey.startsWith('gsk_')) {
        showMessage("This doesn't look like a valid Groq API key. It should start with 'gsk_'", true);
        return;
      }
      
      setButtonLoading(saveApiKeyBtn, true, "Saving...");
      
      const sessionOnly = sessionOnlyCheckbox.checked;
      
      try {
        chrome.runtime.sendMessage(
          {
            action: "saveApiKey", 
            apiKey: apiKey, 
            sessionOnly: sessionOnly
          }, 
          (response) => {            setButtonLoading(saveApiKeyBtn, false, "Save API Key");
            if (response.success) {
              apiKeyStatus.textContent = "API key configured";
              apiKeyStatus.style.backgroundColor = "#0b8043";
              
              // Use smooth transition
              apiKeyContainer.classList.add('hidden');
              setTimeout(() => {
                apiKeyContainer.style.display = 'none';
                apiKeyContainer.classList.remove('hidden');
              }, 300);
              
              apiKeyInput.value = '';
              showMessage("API key saved successfully!");
            } else {
              showMessage("Failed to save API key: " + (response.error || "Unknown error"), true);
            }
          }
        );
      } catch (error) {        setButtonLoading(saveApiKeyBtn, false, "Save API Key");
        showMessage("Error saving API key: " + error.message, true);
      }
    });
  }

  // Toggle API key visibility button click handler
  if (toggleApiKeyBtn) {    toggleApiKeyBtn.addEventListener('click', () => {
      if (apiKeyInput.type === "password") {
        apiKeyInput.type = "text";
        toggleApiKeyBtn.textContent = "Hide";
      } else {
        apiKeyInput.type = "password";
        toggleApiKeyBtn.textContent = "Show";
      }
    });
  }

  // Save translation settings when they change
  if (translationStyle) {    translationStyle.addEventListener('change', async () => {
      await chrome.storage.local.set({
        'translationStyle': translationStyle.value
      });
      showMessage(`Translation style updated to: ${translationStyle.options[translationStyle.selectedIndex].text}`);
    });
  }

  if (languageLevel) {    languageLevel.addEventListener('change', async () => {
      await chrome.storage.local.set({
        'languageLevel': languageLevel.value
      });
      showMessage(`Language level updated to: ${languageLevel.options[languageLevel.selectedIndex].text}`);
    });
  }

  if (translationMode) {    translationMode.addEventListener('change', async () => {
      await chrome.storage.local.set({
        'translationMode': translationMode.value
      });
      showMessage(`Translation mode updated to: ${translationMode.options[translationMode.selectedIndex].text}`);
    });
  }
  
  if (sessionOnlyCheckbox) {    sessionOnlyCheckbox.addEventListener('change', async () => {
      await chrome.storage.local.set({
        'sessionOnly': sessionOnlyCheckbox.checked
      });
      showMessage(`API key storage set to: ${sessionOnlyCheckbox.checked ? "Session Only" : "Persistent"}`);
    });
  }
  // Reset API counter
  if (resetApiCountBtn) {
    resetApiCountBtn.addEventListener('click', () => {
      if (confirm("Reset API call counter to zero?")) {
        setButtonLoading(resetApiCountBtn, true, "Resetting...");
        chrome.runtime.sendMessage({action: "resetApiCount"}, (response) => {
          setButtonLoading(resetApiCountBtn, false, "Reset Counter");
          if (response && response.success) {
            showMessage("API call counter reset successfully");
          } else {
            showMessage("Failed to reset API call counter", true);
          }
          updateApiUsageStats();
        });
      }
    });
  }
});
