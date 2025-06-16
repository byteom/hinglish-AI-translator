import { preprocessInput, offlineTranslate } from "../utils/translator.js";

const translateBtn = document.getElementById("translate-btn");
const explainBtn = document.getElementById("explain-btn");
const inputText = document.getElementById("input-text");
const toneSelect = document.getElementById("tone-select");
const outputDiv = document.getElementById("output");
const explanation = document.getElementById("grammar-explanation");

// Dummy API call (replace with real translation call)
async function translateText(text, tone) {
  // Simulate network failure to show fallback
  const fail = Math.random() > 0.5;
  if (!fail) {
    return `${tone === 'formal' ? "आपका अनुवाद:" : "तेरा ट्रांसलेशन:"} ${text.split('').reverse().join('')}`;
  }
  return null; // Simulate API fail
}

translateBtn.addEventListener("click", async () => {
  let input = inputText.value.trim();
  if (!input) return;

  input = preprocessInput(input);
  const tone = toneSelect.value;

  let result = await translateText(input, tone);

  if (!result) {
    result = offlineTranslate(input) || "⚠️ Translation failed and no offline match found.";
  }

  outputDiv.innerText = result;
});

explainBtn.addEventListener("click", () => {
  const input = inputText.value.trim();
  if (!input) return;

  explanation.innerText = "🧠 Grammar: Past tense detected | Subject: I | Object: school | Verb: went";
});
