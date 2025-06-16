// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translatePage") {
      translatePageContent();
    }
  });
  
  // Function to translate the entire page
  async function translatePageContent() {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '10px';
    loadingIndicator.style.right = '10px';
    loadingIndicator.style.padding = '10px';
    loadingIndicator.style.backgroundColor = '#1a73e8';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.borderRadius = '4px';
    loadingIndicator.style.zIndex = '9999';
    loadingIndicator.textContent = 'Translating page...';
    document.body.appendChild(loadingIndicator);

    try {
      // Get user preference for translation mode
      const { translationMode } = await chrome.storage.local.get(['translationMode']);
      const mode = translationMode || 'paragraphs';
      
      if (mode === 'paragraphs') {
        await translateParagraphs();
      } else {
        await translateAllText();
      }

      loadingIndicator.textContent = 'Translation complete!';
      loadingIndicator.style.backgroundColor = '#0b8043';
      setTimeout(() => loadingIndicator.remove(), 2000);
    } catch (error) {
      console.error('Translation error:', error);
      loadingIndicator.textContent = 'Translation failed!';
      loadingIndicator.style.backgroundColor = '#d93025';
      setTimeout(() => loadingIndicator.remove(), 2000);
    }
  }
    // Translate paragraph by paragraph with batch processing
  async function translateParagraphs() {
    // Create progress indicator
    const progressIndicator = document.createElement('div');
    progressIndicator.id = 'translationProgressIndicator';
    progressIndicator.style.position = 'fixed';
    progressIndicator.style.bottom = '20px';
    progressIndicator.style.right = '20px';
    progressIndicator.style.padding = '10px 15px';
    progressIndicator.style.backgroundColor = '#1a73e8';
    progressIndicator.style.color = 'white';
    progressIndicator.style.borderRadius = '20px';
    progressIndicator.style.zIndex = '9999';
    progressIndicator.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    progressIndicator.style.display = 'flex';
    progressIndicator.style.alignItems = 'center';
    progressIndicator.style.justifyContent = 'center';
    progressIndicator.style.fontFamily = 'Arial, sans-serif';
    progressIndicator.style.transition = 'opacity 0.3s';
    
    // Add progress bar
    const progressText = document.createElement('div');
    progressText.textContent = 'Processing: 0%';
    progressIndicator.appendChild(progressText);
    
    document.body.appendChild(progressIndicator);
    
    // Collect paragraphs to translate
    const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div');
    const elementsToTranslate = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const element = paragraphs[i];
      if (element.textContent.trim() && 
          element.childNodes.length === 1 && 
          element.childNodes[0].nodeType === Node.TEXT_NODE &&
          !element.classList.contains('hinglish-translated')) {
        elementsToTranslate.push(element);
      }
    }
    
    // Listen for progress updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'updateProgress' && request.progress >= 0) {
        progressText.textContent = `Processing: ${request.progress}%`;
      } else if (request.action === 'updateProgress' && request.progress === -1) {
        // Hide progress indicator
        progressIndicator.style.opacity = '0';
        setTimeout(() => progressIndicator.remove(), 300);
      }
    });
    
    try {
      // Process in batches of 5
      const batchSize = 5;
      let translatedCount = 0;
      
      for (let i = 0; i < elementsToTranslate.length; i += batchSize) {
        const batch = elementsToTranslate.slice(i, i + batchSize);
        const promises = batch.map(element => {
          return new Promise(async (resolve) => {
            try {
              const response = await chrome.runtime.sendMessage({
                action: "translateText",
                text: element.textContent
              });
              
              if (response && !response.startsWith("Translation error:")) {
                element.textContent = response;
                element.classList.add('hinglish-translated');
                translatedCount++;
              }
            } catch (error) {
              console.error('Translation error:', error);
            }
            resolve();
          });
        });
        
        await Promise.all(promises);
        
        // Update progress
        const progress = Math.min(100, Math.round((i + batchSize) * 100 / elementsToTranslate.length));
        progressText.textContent = `Processing: ${progress}%`;
      }
      
      // Complete
      progressText.textContent = 'Translation Complete!';
      progressIndicator.style.backgroundColor = '#0b8043';
      setTimeout(() => {
        progressIndicator.style.opacity = '0';
        setTimeout(() => progressIndicator.remove(), 300);
      }, 2000);
      
      return translatedCount;
    } catch (error) {
      console.error('Batch translation error:', error);
      progressText.textContent = 'Translation Failed';
      progressIndicator.style.backgroundColor = '#d93025';
      setTimeout(() => {
        progressIndicator.style.opacity = '0';
        setTimeout(() => progressIndicator.remove(), 300);
      }, 2000);
      return 0;
    }
  }
  
  // Translate all text nodes (more aggressive approach)
  async function translateAllText() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    const textNodes = [];
    
    while (node = walker.nextNode()) {
      if (node.textContent.trim() && 
          node.parentElement && 
          !node.parentElement.classList.contains('hinglish-translated')) {
        textNodes.push(node);
      }
    }
    
    let translatedCount = 0;
    
    for (const node of textNodes) {
      const originalText = node.textContent;
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: "translateText",
          text: originalText
        });
        
        if (response && response !== "Please configure your API key first") {
          node.textContent = response;
          if (node.parentElement) {
            node.parentElement.classList.add('hinglish-translated');
          }
          translatedCount++;
        }
      } catch (error) {
        console.error('Translation error:', error);
      }
    }
    
    return translatedCount;
  }