// Utility functions for text processing and translation
class TranslationHelper {
  static detectCodeMixed(input) {
    const hindiRegex = /[\u0900-\u097F]/;
    const hasHindi = hindiRegex.test(input);
    const hasEnglish = /[a-zA-Z]/.test(input);
    return hasHindi && hasEnglish;
  }

  static preprocessInput(input) {
    if (this.detectCodeMixed(input)) {
      return input.replace(/([a-zA-Z]+)([\u0900-\u097F]+)/g, '$1 $2');
    }
    return input;
  }

  static offlineDictionary = {
    "hello": "नमस्ते",
    "how are you": "आप कैसे हैं",
    "goodbye": "अलविदा",
    "i am fine": "मैं ठीक हूँ",
    "thank you": "धन्यवाद",
    "yes": "हाँ",
    "no": "नहीं",
    "please": "कृपया",
    "sorry": "माफ़ कीजिए",
    "what": "क्या",
    "where": "कहाँ",
    "when": "कब"
  };

  static offlineTranslate(input) {
    const lower = input.trim().toLowerCase();
    return this.offlineDictionary[lower] || null;
  }

  static async translateWithGroq(text, apiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://api.groq.ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          text: text,
          source_lang: 'en',
          target_lang: 'hi-Latn',
          formality: 'neutral'
        })
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`API error ${response.status}: ${errorMsg}`);
      }
      
      const data = await response.json();
      return data.translatedText || 'Translation failed';
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback to offline translation if available
      const offlineResult = this.offlineTranslate(text);
      return offlineResult || `Translation error: ${error.message}`;
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

// Export individual functions for backward compatibility
function preprocessInput(input) {
  return TranslationHelper.preprocessInput(input);
}

function offlineTranslate(input) {
  return TranslationHelper.offlineTranslate(input);
}

export { 
  TranslationHelper as default,
  preprocessInput,
  offlineTranslate 
};