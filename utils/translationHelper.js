function detectCodeMixed(input) {
  const hindiRegex = /[\u0900-\u097F]/;
  const hasHindi = hindiRegex.test(input);
  const hasEnglish = /[a-zA-Z]/.test(input);
  return hasHindi && hasEnglish;
}

function preprocessInput(input) {
  if (detectCodeMixed(input)) {
    return input.replace(/([a-zA-Z]+)([\u0900-\u097F]+)/g, '$1 $2');
  }
  return input;
}

const offlineDictionary = {
  "hello": "नमस्ते",
  "how are you": "आप कैसे हैं",
  "goodbye": "अलविदा",
  "i am fine": "मैं ठीक हूँ",
  "thank you": "धन्यवाद"
};

function offlineTranslate(input) {
  const lower = input.trim().toLowerCase();
  return offlineDictionary[lower] || null;
}

export { preprocessInput, offlineTranslate };
