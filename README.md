# 🇮🇳 Hinglish AI Translator Extension

A Chrome extension that intelligently translates Hinglish (Hindi + English mix) into proper Hindi or English. Powered by AI logic with fallback options for offline translation and tone control.

> 🧑‍💻 Built for learning, clarity, and smooth UX – as part of an internship contribution project.



## 🚀 Features

- ✅ **Tone Selector**: Choose between *formal* and *informal* translation styles
- ✅ **Grammar Explainer**: Understand basic structure of your sentence with “Explain This” feature
- ✅ **Offline Fallback**: Works with common phrases even when AI/API fails
- ✅ **Code-mixed Hinglish Support**: Detects and adjusts input with both Devanagari + English words
- ✅ Clean, responsive UI using native HTML/CSS

---

## 🛠️ How to Install Locally

1. Clone or [Download ZIP](https://github.com/ProPrem/hinglish-ai-translator/archive/refs/heads/main.zip)
2. Open Chrome and go to `chrome://extensions/`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder


# 🧠 Example Usage

- Input: `I school gaya tha`
- Tone: `Formal`
- Output: `आपका अनुवाद: athg ayag loohcs I` *(or actual translation via AI)*

> 💬 Grammar Mode: `🧠 Past tense | Subject: I | Verb: went | Object: school`

---


## 📁 File Structure

hinglish-ai-translator/
├── popup/
│ ├── popup.html
│ └── popup.js
├── utils/
│ └── translator.js
├── README.md
└── manifest.json (not included here)
