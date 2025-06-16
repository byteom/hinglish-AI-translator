// Security utility for handling API key storage and encryption
class SecurityHelper {
  // Simple obfuscation using base64 encoding
  static encryptApiKey(apiKey) {
    try {
      return btoa(apiKey);
    } catch (error) {
      console.error('Error encrypting API key:', error);
      return null;
    }
  }

  // Decrypt API key from storage
  static decryptApiKey(encryptedKey) {
    try {
      return atob(encryptedKey);
    } catch (error) {
      console.error('Error decrypting API key:', error);
      return null;
    }
  }

  // Store API key securely
  static async storeApiKey(apiKey, sessionOnly = false) {
    try {
      const encryptedKey = this.encryptApiKey(apiKey);
      if (!encryptedKey) {
        throw new Error('Failed to encrypt API key');
      }

      if (sessionOnly) {
        // Use sessionStorage for session-only storage
        sessionStorage.setItem('groqApiKey', encryptedKey);
        // Clear from local storage if it was stored there before
        await chrome.storage.local.remove('groqApiKey');
        // Set a flag to indicate we're using session storage
        await chrome.storage.local.set({ 'apiKeyInSession': true });
      } else {
        // Store in Chrome's local storage for persistence
        await chrome.storage.local.set({ 'groqApiKey': encryptedKey });
        // Clear session storage if it was stored there before
        sessionStorage.removeItem('groqApiKey');
        // Clear the session flag
        await chrome.storage.local.remove('apiKeyInSession');
      }
      return true;
    } catch (error) {
      console.error('Error storing API key:', error);
      return false;
    }
  }

  // Retrieve API key from storage
  static async getApiKey() {
    try {
      // Check if we're using session storage
      const { apiKeyInSession } = await chrome.storage.local.get('apiKeyInSession');
      
      if (apiKeyInSession) {
        // Get from session storage
        const encryptedKey = sessionStorage.getItem('groqApiKey');
        if (!encryptedKey) return null;
        return this.decryptApiKey(encryptedKey);
      } else {
        // Get from local storage
        const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
        if (!groqApiKey) return null;
        return this.decryptApiKey(groqApiKey);
      }
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return null;
    }
  }

  // Remove API key from all storage options
  static async removeApiKey() {
    try {
      await chrome.storage.local.remove(['groqApiKey', 'apiKeyInSession']);
      sessionStorage.removeItem('groqApiKey');
      return true;
    } catch (error) {
      console.error('Error removing API key:', error);
      return false;
    }
  }
}

// Make available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityHelper;
}