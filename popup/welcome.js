// Welcome page for the Hinglish AI Translator Extension
// Handles API key setup and validation

document.addEventListener('DOMContentLoaded', () => {
  console.log("Welcome page loaded");
  
  // Create error message container
  const errorMessage = document.createElement('div');
  errorMessage.id = 'errorMessage';
  errorMessage.style.color = '#d93025';
  errorMessage.style.marginTop = '15px';
  errorMessage.style.padding = '8px';
  errorMessage.style.borderRadius = '4px';
  errorMessage.style.fontWeight = '500';
  errorMessage.style.display = 'none';
  document.querySelector('.setup').appendChild(errorMessage);
  
  // Create success message container
  const successMessage = document.createElement('div');
  successMessage.id = 'successMessage';
  successMessage.style.color = '#0b8043';
  successMessage.style.backgroundColor = 'rgba(11, 128, 67, 0.1)';
  successMessage.style.marginTop = '15px';
  successMessage.style.padding = '8px';
  successMessage.style.borderRadius = '4px';
  successMessage.style.fontWeight = '500';
  successMessage.style.display = 'none';
  document.querySelector('.setup').appendChild(successMessage);
  
  // Get form elements
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveApiKey');
  const sessionOnlyCheckbox = document.getElementById('sessionOnlyStorage');
    // Check if API key exists - if it does, redirect to main popup
  chrome.runtime.sendMessage({action: "checkApiKey"}, (response) => {
    console.log("API key exists check:", response);
    
    if (response && response.hasKey === true) {
      const storageTypeText = response.storageType === 'session' ? 
        "API key already configured! (Session only)" : 
        "API key already configured!";
      
      successMessage.textContent = storageTypeText;
      successMessage.style.display = 'block';
      
      // Redirect with small delay to show the success message
      setTimeout(() => {
        window.location.href = 'popup.html';
      }, 1000);
    }
  });
  // API key save button click handler
  saveButton.addEventListener('click', () => {
    // Hide previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    // Get API key from input
    const apiKey = apiKeyInput.value.trim();
    
    // Validate input exists
    if (!apiKey) {
      errorMessage.textContent = 'Please enter your API key';
      errorMessage.style.display = 'block';
      apiKeyInput.focus();
      return;
    }
    
    // Validate API key format
    if (!apiKey.startsWith('gsk_')) {
      errorMessage.textContent = 'This doesn\'t look like a valid Groq API key. It should start with "gsk_"';
      errorMessage.style.display = 'block';
      apiKeyInput.focus();
      return;
    }
    
    // Update button state
    const sessionOnly = sessionOnlyCheckbox.checked;
    saveButton.disabled = true;
    saveButton.textContent = 'Validating...';
    
    // First attempt to validate the API key with a simple test request to Groq API
    validateApiKey(apiKey).then(isValid => {
      if (isValid) {
        // API key is valid, save it
        saveApiKey(apiKey, sessionOnly);
      } else {
        // API key validation failed
        saveButton.disabled = false;
        saveButton.textContent = 'Save Key';
        errorMessage.textContent = 'Invalid API key. Please check your key and try again.';
        errorMessage.style.display = 'block';
      }
    }).catch(error => {
      // Handle API validation error
      saveButton.disabled = false;
      saveButton.textContent = 'Save Key';
      errorMessage.textContent = 'Error validating API key: ' + error.message;
      errorMessage.style.display = 'block';
      console.error('API key validation error:', error);
    });
  });
  
  // Function to validate API key by making a test request
  async function validateApiKey(apiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('API validation error:', error);
      return false;
    }
  }
  
  // Function to save API key after validation
  function saveApiKey(apiKey, sessionOnly) {
    chrome.runtime.sendMessage(
      {
        action: 'saveApiKey', 
        apiKey: apiKey, 
        sessionOnly: sessionOnly
      }, 
      (response) => {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Key';
        
        if (response && response.success) {          // Show success message
          const storageText = sessionOnly ? 'API key saved successfully! (Session only)' : 'API key saved successfully!';
          successMessage.textContent = storageText;
          successMessage.style.display = 'block';
          
          // Clear input field
          apiKeyInput.value = '';
          
          // Redirect to popup after short delay
          setTimeout(() => {
            window.location.href = 'popup.html';
          }, 1500);
        } else {
          // Show error message
          const errorMsg = response && response.error ? response.error : 'Unknown error occurred';
          errorMessage.textContent = 'Failed to save API key: ' + errorMsg;
          errorMessage.style.display = 'block';
          console.error('Error saving API key:', response);
        }
      }
    );
  }
});
