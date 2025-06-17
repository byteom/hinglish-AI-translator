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
  
  // Translate paragraph by paragraph
  async function translateParagraphs() {
    const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div');
    let translatedCount = 0;
    
    for (const element of paragraphs) {
      if (element.textContent.trim() && 
          element.childNodes.length === 1 && 
          element.childNodes[0].nodeType === Node.TEXT_NODE &&
          !element.classList.contains('hinglish-translated')) {
        
        const originalText = element.textContent;
        
        const response = await getTranslatedText(originalText);
        async function getTranslatedText(originalText) {
          try {
            const response = await chrome.runtime.sendMessage({
              action: "translateText",
              text: originalText
            });
        
            if (response && response !== "Please configure your API key first") {
              return response;
            }
          } catch (error) {
            console.error('Translation error:', error);
          }
          return null;
        }
      }
    }
    
    return translatedCount;
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
