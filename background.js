// --- BEGIN SecurityHelper ---
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
        // Use sessionStorage for session-only storage (not available in background script)
        // Mark it for session-only in storage
        await chrome.storage.local.set({ 
          'groqApiKey': encryptedKey,
          'apiKeyInSession': true 
        });
      } else {
        // Store in Chrome's local storage for persistence
        await chrome.storage.local.set({ 
          'groqApiKey': encryptedKey,
          'apiKeyInSession': false 
        });
      }
      return true;
    } catch (error) {
      console.error('Error storing API key:', error);
      return false;
    }
  }
  // Retrieve the stored API key
  static async getApiKey() {
    try {
      // First check if we've marked the API key as session-only
      const { apiKeyInSession, groqApiKey } = await chrome.storage.local.get(['apiKeyInSession', 'groqApiKey']);
      
      if (groqApiKey) {
        return this.decryptApiKey(groqApiKey);
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return null;
    }
  }

  // Check if the API key exists
  static async hasApiKey() {
    const { groqApiKey } = await chrome.storage.local.get(['groqApiKey']);
    return !!groqApiKey;
  }
  
  // Get the API key storage type (session-only or persistent)
  static async getApiKeyStorageType() {
    try {
      const { apiKeyInSession } = await chrome.storage.local.get(['apiKeyInSession']);
      return apiKeyInSession ? 'session' : 'persistent';
    } catch (error) {
      console.error('Error getting API key storage type:', error);
      return null;
    }
  }

  // Clear the stored API key
  static async clearApiKey() {
    try {
      await chrome.storage.local.remove(['groqApiKey', 'apiKeyInSession']);
      return true;
    } catch (error) {
      console.error('Error clearing API key:', error);
      return false;
    }
  }
}
// --- END SecurityHelper ---

// --- BEGIN ApiRequestManager ---
// Utility for managing API requests with throttling and rate limiting
class ApiRequestManager {
  constructor(options = {}) {
    // Default settings
    this.options = {
      throttleDelay: 500, // 500ms between requests
      maxRetries: 5,
      initialBackoffDelay: 1000, // 1s
      ...options
    };

    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.apiCallCount = 0;
    this.lastApiStatus = null;
    
    // Load existing call count
    this.loadCallCount();
  }

  // Add a request to the queue
  async addRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        fn: requestFn,
        resolve,
        reject,
        retryCount: 0
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  // Process the request queue with throttling
  async processQueue() {
    if (this.requestQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const { fn, resolve, reject, retryCount } = this.requestQueue.shift();

    try {
      const result = await fn();
      
      // Increment successful API call count
      this.apiCallCount++;
      this.lastApiStatus = 'success';
      this.saveCallCount();
      
      resolve(result);
    } catch (error) {
      // Apply exponential backoff on failure
      if (retryCount < this.options.maxRetries) {
        const backoffDelay = this.options.initialBackoffDelay * Math.pow(2, retryCount);
        console.log(`API request failed, retrying in ${backoffDelay}ms...`, error);
        
        // Push back into queue with increased retry count
        this.requestQueue.unshift({
          fn,
          resolve,
          reject,
          retryCount: retryCount + 1
        });
        
        this.lastApiStatus = 'retrying';
        
        setTimeout(() => {
          this.processNextRequest();
        }, backoffDelay);
      } else {
        console.error('API request failed after max retries:', error);
        this.lastApiStatus = 'failed';
        reject(error);
      }
    }

    // Apply throttling delay before processing the next request
    setTimeout(() => {
      this.processNextRequest();
    }, this.options.throttleDelay);
  }

  // Process the next request in the queue
  processNextRequest() {
    if (this.requestQueue.length > 0) {
      this.processQueue();
    } else {
      this.isProcessingQueue = false;
    }
  }
    // Process batch of requests in parallel with progress tracking
  async processBatch(items, processFn, batchSize = 5, progressCallback = null) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn("ProcessBatch called with empty or invalid items array");
      if (progressCallback) progressCallback(-1); // Signal completion with empty batch
      return [];
    }

    const total = items.length;
    let processed = 0;
    let results = [];
    let errors = [];
    
    try {
      // Process in batches
      for (let i = 0; i < total; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(item => 
          this.addRequest(() => processFn(item))
        );
        
        // Wait for the current batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Update progress
        processed += batch.length;
        if (progressCallback) {
          const progress = Math.round((processed / total) * 100);
          progressCallback(progress);
        }
        
        // Collect results and track errors
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`Error processing item ${i + index}:`, result.reason);
            errors.push({
              itemIndex: i + index,
              error: result.reason?.message || "Unknown error"
            });
            // Add null placeholder for failed items to maintain array index correlation
            results.push(null);
          }
        });

        // Allow a short break between batches to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error("Batch processing encountered an error:", error);
    } finally {
      // Signal completion
      if (progressCallback) {
        progressCallback(-1); // -1 signals completion
      }
      
      // Log a summary of errors if any occurred
      if (errors.length > 0) {
        console.warn(`Batch processing completed with ${errors.length} errors out of ${total} items`);
      }
    }
    
    return results;
  }

  // Save the API call count to storage
  async saveCallCount() {
    try {
      await chrome.storage.local.set({ 'apiCallCount': this.apiCallCount });
    } catch (error) {
      console.error('Error saving API call count:', error);
    }
  }

  // Load the API call count from storage
  async loadCallCount() {
    try {
      const { apiCallCount } = await chrome.storage.local.get(['apiCallCount']);
      this.apiCallCount = apiCallCount || 0;
    } catch (error) {
      console.error('Error loading API call count:', error);
    }
  }

  // Reset API call counter
  async resetApiCallCount() {
    this.apiCallCount = 0;
    await this.saveCallCount();
  }

  // Get the current API call count
  getApiCallCount() {
    return this.apiCallCount;
  }
  
  // Get the last API status
  getLastApiStatus() {
    return this.lastApiStatus;
  }
}
// --- END ApiRequestManager ---

// Initialize the API request manager for throttling and rate limiting
const apiRequestManager = new ApiRequestManager({
  throttleDelay: 500,
  maxRetries: 5,
  initialBackoffDelay: 1000
});

// Handle context menu for highlighted text translation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateToHinglish",
    title: "Translate to Hinglish",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "explainInHinglish",
    title: "Explain in Hinglish",
    contexts: ["selection"]
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);
  
  // Translation handler
  if (request.action === "translateText") {
    translateText(request.text)
      .then(result => {
        console.log("Translation completed successfully");
        sendResponse(result);
      })
      .catch(error => {
        console.error("Translation error:", error);
        sendResponse("Translation error: " + error.message);
      });
    return true; // Required for async sendResponse
  }
  
  // Explanation handler
  if (request.action === "explainText") {
    explainText(request.text)
      .then(result => {
        console.log("Explanation completed successfully");
        sendResponse(result);
      })
      .catch(error => {
        console.error("Explanation error:", error);
        sendResponse("Explanation error: " + error.message);
      });
    return true; // Required for async sendResponse
  }
  
  // API usage statistics handler
  if (request.action === "getApiUsage") {
    try {
      const stats = {
        callCount: apiRequestManager.getApiCallCount(),
        lastStatus: apiRequestManager.getLastApiStatus()
      };
      console.log("Returning API usage stats:", stats);
      sendResponse(stats);
    } catch (error) {
      console.error("Error getting API usage stats:", error);
      sendResponse({ callCount: 0, lastStatus: "unknown", error: error.message });
    }
    return true;
  }
  
  // Reset API call counter handler
  if (request.action === "resetApiCallCount") {
    apiRequestManager.resetApiCallCount()
      .then(() => {
        console.log("API call count reset successfully");
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error("Error resetting API call count:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
    // Check if API key exists handler
  if (request.action === "checkApiKey") {
    Promise.all([SecurityHelper.hasApiKey(), SecurityHelper.getApiKeyStorageType()])
      .then(([hasKey, storageType]) => {
        console.log("API key check result:", hasKey, "Storage type:", storageType);
        sendResponse({ hasKey, storageType });
      })
      .catch(error => {
        console.error("Error checking API key:", error);
        sendResponse({ hasKey: false, error: error.message });
      });
    return true;
  }
  
  // Save API key handler
  if (request.action === "saveApiKey") {
    console.log("Saving API key (session-only:", request.sessionOnly, ")");
    
    if (!request.apiKey) {
      console.error("Missing API key in request");
      sendResponse({ success: false, error: "No API key provided" });
      return true;
    }
    
    SecurityHelper.storeApiKey(request.apiKey, request.sessionOnly)
      .then(success => {
        console.log("API key save result:", success);
        if (success) {
          // Mark that API key has been set
          chrome.storage.local.set({ 'apiKeySet': true });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Failed to store API key" });
        }
      })
      .catch(error => {
        console.error("Error saving API key:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  // Clear API key handler
  if (request.action === "clearApiKey") {
    SecurityHelper.clearApiKey()
      .then(success => {
        console.log("API key cleared:", success);
        if (success) {
          chrome.storage.local.remove('apiKeySet');
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Failed to clear API key" });
        }
      })
      .catch(error => {
        console.error("Error clearing API key:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  // Batch translation handler
  if (request.action === "translateBatch") {
    processBatchTranslation(request.texts, request.tabId)
      .then(results => {
        console.log("Batch translation complete", { count: results.length });
        sendResponse({ success: true, results });
      })
      .catch(error => {
        console.error("Batch translation error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  // Unknown action handler
  console.warn("Unhandled message action:", request.action);
  sendResponse({ success: false, error: "Unknown action" });
  return true;
});

// Handle batch translation for page content
async function processBatchTranslation(texts, tabId) {
  if (!texts || !texts.length) {
    console.warn("Empty texts array provided to batch translation");
    return [];
  }
  
  // Process texts in batches with progress updates
  return await apiRequestManager.processBatch(
    texts, 
    translateText, 
    5, 
    (progress) => {
      // Send progress updates to content script
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          action: 'updateProgress',
          progress: progress
        }).catch(err => console.error("Error sending progress update:", err));
      }
    }
  );
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translateToHinglish" && info.selectionText) {
    try {
      // Show loading popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showLoadingPopup,
        args: []
      });

      const translatedText = await translateText(info.selectionText);
      
      // Remove loading popup and show translation
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showTranslationPopup,
        args: [info.selectionText, translatedText]
      });
    } catch (error) {
      console.error("Context menu translation error:", error);
      // Show error in popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showErrorPopup,
        args: [error.message]
      });
    }
  } else if (info.menuItemId === "explainInHinglish" && info.selectionText) {
    try {
      // Show loading popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showLoadingPopup,
        args: []
      });

      const explanation = await explainText(info.selectionText);
      
      // Remove loading popup and show explanation
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showExplanationPopup,
        args: [info.selectionText, explanation]
      });
    } catch (error) {
      console.error("Context menu explanation error:", error);
      // Show error in popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showErrorPopup,
        args: [error.message]
      });
    }
  }
});

// Function to get translation prompt based on style and level
function getTranslationPrompt(style, level) {
  const prompts = {
    hinglish: {
      balanced: "You are a translator that converts English text to Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural in Hinglish. Use a balanced mix of Hindi and English words. Only respond with the translated text, no explanations.",
      moreHindi: "You are a translator that converts English text to Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural in Hinglish. Use more Hindi words than English. Only respond with the translated text, no explanations.",
      moreEnglish: "You are a translator that converts English text to Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural in Hinglish. Use more English words than Hindi. Only respond with the translated text, no explanations."
    },
    hindi: {
      balanced: "You are a translator that converts English text to Hindi (Devanagari script). Keep the meaning exactly the same but make it sound natural in Hindi. Use a balanced mix of formal and colloquial Hindi. Only respond with the translated text, no explanations.",
      moreHindi: "You are a translator that converts English text to Hindi (Devanagari script). Keep the meaning exactly the same but make it sound natural in Hindi. Use more formal Hindi words. Only respond with the translated text, no explanations.",
      moreEnglish: "You are a translator that converts English text to Hindi (Devanagari script). Keep the meaning exactly the same but make it sound natural in Hindi. Use more colloquial Hindi words. Only respond with the translated text, no explanations."
    },
    roman: {
      balanced: "You are a translator that converts Hindi text to Romanized Hindi (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural. Use a balanced mix of formal and colloquial words. Only respond with the translated text, no explanations.",
      moreHindi: "You are a translator that converts Hindi text to Romanized Hindi (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural. Use more formal words. Only respond with the translated text, no explanations.",
      moreEnglish: "You are a translator that converts Hindi text to Romanized Hindi (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural. Use more colloquial words. Only respond with the translated text, no explanations."
    },
    formal: {
      balanced: "You are a translator that converts English text to formal Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound professional and formal. Use a balanced mix of Hindi and English words. Only respond with the translated text, no explanations.",
      moreHindi: "You are a translator that converts English text to formal Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound professional and formal. Use more Hindi words than English. Only respond with the translated text, no explanations.",
      moreEnglish: "You are a translator that converts English text to formal Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound professional and formal. Use more English words than Hindi. Only respond with the translated text, no explanations."
    },
    casual: {
      balanced: "You are a translator that converts English text to casual Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound casual and conversational. Use a balanced mix of Hindi and English words. Only respond with the translated text, no explanations.",
      moreHindi: "You are a translator that converts English text to casual Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound casual and conversational. Use more Hindi words than English. Only respond with the translated text, no explanations.",
      moreEnglish: "You are a translator that converts English text to casual Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound casual and conversational. Use more English words than Hindi. Only respond with the translated text, no explanations."
    }
  };

  return prompts[style][level] || prompts.hinglish.balanced;
}

// Function to translate text using Groq API
async function translateText(text) {
  try {
    // Get API key using our security helper
    const apiKey = await SecurityHelper.getApiKey();
    if (!apiKey) {
      throw new Error("Please configure your API key first");
    }

    // Get translation settings
    const { translationSettings } = await chrome.storage.local.get(['translationSettings']);
    const style = translationSettings?.style || 'hinglish';
    const level = translationSettings?.level || 'balanced';
    const prompt = getTranslationPrompt(style, level);

    // Queue the API request with our request manager
    return await apiRequestManager.addRequest(async () => {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: [{
            role: "system",
            content: prompt
          }, {
            role: "user",
            content: text
          }],
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error?.message || `API error: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      
      const data = await response.json();
      const translatedText = data.choices[0].message.content.trim();
      
      if (!translatedText) {
        throw new Error("Empty translation received");
      }
      
      return translatedText;
    });
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

// Function to explain text using Groq API
async function explainText(text) {
  try {
    // Get API key using our security helper
    const apiKey = await SecurityHelper.getApiKey();
    if (!apiKey) {
      throw new Error("Please configure your API key first");
    }

    // Get translation settings
    const { translationSettings } = await chrome.storage.local.get(['translationSettings']);
    const style = translationSettings?.style || 'hinglish';
    const level = translationSettings?.level || 'balanced';
    const prompt = `You are an AI assistant that explains concepts in ${style === 'hindi' ? 'Hindi' : 'Hinglish'}. 
      Provide a clear and detailed explanation of the given text. 
      Make it easy to understand and use ${level === 'moreHindi' ? 'more Hindi words' : level === 'moreEnglish' ? 'more English words' : 'a balanced mix of Hindi and English words'}.
      Format your response in a clear, structured way with bullet points or short paragraphs.
      Only respond with the explanation, no additional text.`;

    // Queue the API request with our request manager
    return await apiRequestManager.addRequest(async () => {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: [{
            role: "system",
            content: prompt
          }, {
            role: "user",
            content: text
          }],
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error?.message || `API error: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      
      const data = await response.json();
      const explanation = data.choices[0].message.content.trim();
      
      if (!explanation) {
        throw new Error("Empty explanation received");
      }
      
      return explanation;
    });
  } catch (error) {
    console.error("Explanation error:", error);
    throw error;
  }
}

// Function to show loading popup
function showLoadingPopup() {
  const popup = document.createElement('div');
  popup.id = 'translationLoadingPopup';
  popup.style.position = 'fixed';
  popup.style.zIndex = '9999';
  popup.style.borderRadius = '8px';
  popup.style.padding = '20px';
  popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  popup.style.maxWidth = '300px';
  popup.style.fontFamily = 'Arial, sans-serif';
  popup.style.fontSize = '14px';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.backgroundColor = '#ffffff';
  popup.style.color = '#202124';
  popup.style.textAlign = 'center';

  // Check if dark mode is enabled
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    popup.style.backgroundColor = '#202124';
    popup.style.color = '#e8eaed';
  }
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.style.borderRadius = '50%';
  spinner.style.width = '24px';
  spinner.style.height = '24px';
  spinner.style.margin = '0 auto 12px';
  spinner.style.border = '3px solid rgba(0, 0, 0, 0.1)';
  spinner.style.borderTopColor = '#1a73e8';
  spinner.style.animation = 'spin 1s linear infinite';
  
  const spinnerStyle = document.createElement('style');
  spinnerStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(spinnerStyle);

  const message = document.createElement('div');
  message.textContent = 'Translating...';

  popup.appendChild(spinner);
  popup.appendChild(message);
  
  // Remove any existing popups before creating a new one
  const existingPopup = document.getElementById('translationLoadingPopup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  document.body.appendChild(popup);
}

// Function to show translation popup
function showTranslationPopup(original, translated) {
  // Remove loading popup if exists
  const loadingPopup = document.getElementById('translationLoadingPopup');
  if (loadingPopup) {
    loadingPopup.remove();
  }
  
  // Create translation popup
  const popup = document.createElement('div');
  popup.id = 'translationResultPopup';
  popup.style.position = 'fixed';
  popup.style.zIndex = '9999';
  popup.style.borderRadius = '8px';
  popup.style.padding = '20px';
  popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  popup.style.maxWidth = '400px';
  popup.style.fontFamily = 'Arial, sans-serif';
  popup.style.fontSize = '14px';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.backgroundColor = '#ffffff';
  popup.style.color = '#202124';
  
  // Check if dark mode is enabled
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    popup.style.backgroundColor = '#202124';
    popup.style.color = '#e8eaed';
  }

  const originalHeader = document.createElement('h3');
  originalHeader.textContent = 'Original:';
  originalHeader.style.margin = '0 0 5px 0';
  originalHeader.style.fontSize = '14px';
  originalHeader.style.fontWeight = 'normal';
  originalHeader.style.color = '#5f6368';
  
  const originalText = document.createElement('div');
  originalText.textContent = original;
  originalText.style.marginBottom = '15px';
  
  const translationHeader = document.createElement('h3');
  translationHeader.textContent = 'Translation:';
  translationHeader.style.margin = '0 0 5px 0';
  translationHeader.style.fontSize = '14px';
  translationHeader.style.fontWeight = 'normal';
  translationHeader.style.color = '#5f6368';
  
  const translationText = document.createElement('div');
  translationText.textContent = translated;
  translationText.style.marginBottom = '15px';
  
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'space-between';
  actions.style.marginTop = '15px';
  
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy Translation';
  copyButton.style.padding = '8px 12px';
  copyButton.style.backgroundColor = '#1a73e8';
  copyButton.style.color = 'white';
  copyButton.style.border = 'none';
  copyButton.style.borderRadius = '4px';
  copyButton.style.cursor = 'pointer';
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(translated).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    });
  });
  
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.padding = '8px 12px';
  closeButton.style.backgroundColor = 'transparent';
  closeButton.style.color = '#5f6368';
  closeButton.style.border = '1px solid #dadce0';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.marginLeft = '10px';
  closeButton.addEventListener('click', () => {
    popup.remove();
  });
  
  actions.appendChild(copyButton);
  actions.appendChild(closeButton);
  
  popup.appendChild(originalHeader);
  popup.appendChild(originalText);
  popup.appendChild(translationHeader);
  popup.appendChild(translationText);
  popup.appendChild(actions);
  
  document.body.appendChild(popup);
}

// Function to show explanation popup
function showExplanationPopup(original, explanation) {
  // Remove loading popup if exists
  const loadingPopup = document.getElementById('translationLoadingPopup');
  if (loadingPopup) {
    loadingPopup.remove();
  }
  
  // Create explanation popup
  const popup = document.createElement('div');
  popup.id = 'explanationResultPopup';
  popup.style.position = 'fixed';
  popup.style.zIndex = '9999';
  popup.style.borderRadius = '8px';
  popup.style.padding = '20px';
  popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  popup.style.maxWidth = '450px';
  popup.style.fontFamily = 'Arial, sans-serif';
  popup.style.fontSize = '14px';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.backgroundColor = '#ffffff';
  popup.style.color = '#202124';
  popup.style.maxHeight = '70vh';
  popup.style.overflow = 'auto';
  
  // Check if dark mode is enabled
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    popup.style.backgroundColor = '#202124';
    popup.style.color = '#e8eaed';
  }

  const originalHeader = document.createElement('h3');
  originalHeader.textContent = 'Original Text:';
  originalHeader.style.margin = '0 0 5px 0';
  originalHeader.style.fontSize = '14px';
  originalHeader.style.fontWeight = 'normal';
  originalHeader.style.color = '#5f6368';
  
  const originalText = document.createElement('div');
  originalText.textContent = original;
  originalText.style.marginBottom = '15px';
  originalText.style.padding = '10px';
  originalText.style.backgroundColor = 'rgba(0,0,0,0.05)';
  originalText.style.borderRadius = '4px';
  
  const explanationHeader = document.createElement('h3');
  explanationHeader.textContent = 'Explanation:';
  explanationHeader.style.margin = '0 0 5px 0';
  explanationHeader.style.fontSize = '14px';
  explanationHeader.style.fontWeight = 'normal';
  explanationHeader.style.color = '#5f6368';
  
  const explanationText = document.createElement('div');
  explanationText.innerHTML = explanation.replace(/\n/g, '<br>');
  explanationText.style.marginBottom = '15px';
  explanationText.style.lineHeight = '1.5';
  
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'space-between';
  actions.style.marginTop = '15px';
  
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy Explanation';
  copyButton.style.padding = '8px 12px';
  copyButton.style.backgroundColor = '#1a73e8';
  copyButton.style.color = 'white';
  copyButton.style.border = 'none';
  copyButton.style.borderRadius = '4px';
  copyButton.style.cursor = 'pointer';
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(explanation).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    });
  });
  
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.padding = '8px 12px';
  closeButton.style.backgroundColor = 'transparent';
  closeButton.style.color = '#5f6368';
  closeButton.style.border = '1px solid #dadce0';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.marginLeft = '10px';
  closeButton.addEventListener('click', () => {
    popup.remove();
  });
  
  actions.appendChild(copyButton);
  actions.appendChild(closeButton);
  
  popup.appendChild(originalHeader);
  popup.appendChild(originalText);
  popup.appendChild(explanationHeader);
  popup.appendChild(explanationText);
  popup.appendChild(actions);
  
  document.body.appendChild(popup);
}

// Function to show error popup
function showErrorPopup(errorMessage) {
  // Remove loading popup if exists
  const loadingPopup = document.getElementById('translationLoadingPopup');
  if (loadingPopup) {
    loadingPopup.remove();
  }
  
  // Create error popup
  const popup = document.createElement('div');
  popup.id = 'errorPopup';
  popup.style.position = 'fixed';
  popup.style.zIndex = '9999';
  popup.style.borderRadius = '8px';
  popup.style.padding = '20px';
  popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  popup.style.maxWidth = '350px';
  popup.style.fontFamily = 'Arial, sans-serif';
  popup.style.fontSize = '14px';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.backgroundColor = '#ffffff';
  popup.style.color = '#202124';
  popup.style.border = '1px solid #f28b82';
  
  // Check if dark mode is enabled
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    popup.style.backgroundColor = '#202124';
    popup.style.color = '#e8eaed';
  }
  
  const errorIcon = document.createElement('div');
  errorIcon.innerHTML = '&#9888;';
  errorIcon.style.fontSize = '24px';
  errorIcon.style.color = '#d93025';
  errorIcon.style.marginBottom = '10px';
  
  const errorTitle = document.createElement('h3');
  errorTitle.textContent = 'Error';
  errorTitle.style.margin = '0 0 10px 0';
  errorTitle.style.color = '#d93025';
  
  const errorText = document.createElement('div');
  errorText.textContent = errorMessage;
  errorText.style.marginBottom = '15px';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.padding = '8px 12px';
  closeButton.style.backgroundColor = '#d93025';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.width = '100%';
  closeButton.addEventListener('click', () => {
    popup.remove();
  });
  
  popup.appendChild(errorIcon);
  popup.appendChild(errorTitle);
  popup.appendChild(errorText);
  popup.appendChild(closeButton);
  
  document.body.appendChild(popup);
}
