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
      await this.incrementApiCallCount();
      this.lastApiStatus = 'success';
      await chrome.storage.local.set({ lastApiStatus: 'success' });
      
      resolve(result);
    } catch (error) {
      console.error('API request error:', error);
      
      // Check if it's a rate limiting error (HTTP 429)
      if (error.status === 429 && retryCount < this.options.maxRetries) {
        const nextRetry = this.requestQueue.length;
        const backoffDelay = this.options.initialBackoffDelay * Math.pow(2, retryCount);
        
        console.log(`Rate limited. Retrying after ${backoffDelay}ms (Attempt ${retryCount + 1}/${this.options.maxRetries})`);
        
        setTimeout(() => {
          // Re-add this request to the queue with incremented retry count
          this.requestQueue.splice(nextRetry, 0, {
            fn,
            resolve,
            reject,
            retryCount: retryCount + 1
          });
        }, backoffDelay);
        
        this.lastApiStatus = 'rate-limited';
      } else {
        this.lastApiStatus = 'error';
        await chrome.storage.local.set({ lastApiStatus: 'error' });
        reject(error);
      }
    }

    // Wait for throttle delay before processing next request
    setTimeout(() => {
      this.processQueue();
    }, this.options.throttleDelay);
  }

  // Load the current API call count from storage
  async loadCallCount() {
    try {
      const { apiCallCount = 0 } = await chrome.storage.local.get('apiCallCount');
      this.apiCallCount = apiCallCount;
      
      const { lastApiStatus = null } = await chrome.storage.local.get('lastApiStatus');
      this.lastApiStatus = lastApiStatus;
    } catch (error) {
      console.error('Error loading API call count:', error);
    }
  }

  // Increment the API call count
  async incrementApiCallCount() {
    try {
      this.apiCallCount++;
      await chrome.storage.local.set({ apiCallCount: this.apiCallCount });
    } catch (error) {
      console.error('Error incrementing API call count:', error);
    }
  }

  // Reset the API call counter
  async resetApiCallCount() {
    try {
      this.apiCallCount = 0;
      await chrome.storage.local.set({ apiCallCount: 0 });
    } catch (error) {
      console.error('Error resetting API call count:', error);
    }
  }

  // Get the current API call count
  getApiCallCount() {
    return this.apiCallCount;
  }
  
  // Get the last API status
  getLastApiStatus() {
    return this.lastApiStatus;
  }
  
  // Batch process an array of items with the given processor function
  async batchProcess(items, processorFn, batchSize = 5) {
    const results = [];
    const batches = [];
    
    // Split items into batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    // Process each batch sequentially
    for (let i = 0; i < batches.length; i++) {
      const batchResults = await Promise.all(
        batches[i].map(item => this.addRequest(() => processorFn(item)))
      );
      results.push(...batchResults);
      
      // Report progress after each batch
      const progress = Math.min(100, Math.round((i + 1) * 100 / batches.length));
      chrome.runtime.sendMessage({ action: 'updateProgress', progress });
    }
    
    // Reset progress when done
    chrome.runtime.sendMessage({ action: 'updateProgress', progress: 100 });
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'updateProgress', progress: -1 });
    }, 1000);
    
    return results;
  }
}

// Make available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiRequestManager;
}
