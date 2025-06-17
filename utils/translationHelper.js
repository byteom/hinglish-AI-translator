// Utility functions for text processing and translation
class TranslationHelper {
    static async translateWithGroq(text, apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10sec timeout
        const response = await fetch('https://api.groq.ai/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          signal: controller.signal, //Required to make abort work
          body: JSON.stringify({
            text: text,
            source_lang: 'en',
            target_lang: 'hi-Latn',
            formality: 'neutral'
          })
        });
        
        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(`API error ${response.status}: ${errorMsg}`);
        }
        
        const data = await response.json();
        return data.translatedText || chrome.i18n.getMessage('translationFailed');
      } catch (error) {
        console.error('Translation error:', error);
        return `${chrome.i18n.getMessage('translationFailed')}: ${error.message}`;
      }
    }
  
    static isTranslatableText(text) {
      // Skip empty strings, single characters, or numbers
      if (!text || text.length < 2 || /^\d+$/.test(text)) return false;
      
      // Skip code blocks or special formatting
      if (text.startsWith('{') && text.endsWith('}')) return false;
      if (text.startsWith('[') && text.endsWith(']')) return false;
      
      return true;
    }
  
    static createTranslationPopup(original, translated) {
      const popup = document.createElement('div');
      popup.className = 'hinglish-popup';
      
      popup.innerHTML = `
        <div class="hinglish-popup-content">
          <div class="hinglish-original">
            <strong>Original:</strong> 
            <span>${original}</span>
          </div>
          <div class="hinglish-translation">
            <strong>Hinglish:</strong> 
            <span>${translated}</span>
          </div>
          <div class="hinglish-popup-actions">
            <button class="hinglish-copy" title="Copy translation">📋</button>
            <button class="hinglish-close" title="Close">✕</button>
          </div>
        </div>
      `;
      
      return popup;
    }
  }
  
  // Make available to other scripts
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslationHelper;
  }
