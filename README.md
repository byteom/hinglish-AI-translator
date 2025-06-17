
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
=======
# 🚀 Hinglish Translator - Chrome Extension

A powerful and intuitive Chrome extension that brings seamless translation and AI-powered explanations to your browsing experience. Transform any English text into Hinglish (Hindi written in English letters) or Hindi with just a right-click!

## ✨ Features

### 🎯 Smart Translation
- **Multiple Translation Styles**
  - Hinglish (Default) - Perfect blend of Hindi and English
  - Hindi (Devanagari) - Pure Hindi script
  - Roman - Hindi in English letters
  - Formal Hinglish - Professional tone
  - Casual Hinglish - Conversational style

### 🎨 Customization Options
- **Language Level Control**
  - Balanced - Equal mix of Hindi and English
  - More Hindi - Hindi-dominant translation
  - More English - English-dominant translation

### 🤖 AI-Powered Features
- **Smart Translation** - Context-aware translations that maintain the original meaning
- **AI Explanations** - Get detailed explanations of the selected text in your preferred language style
- **Natural Language Processing** - Powered by advanced Groq AI models

### 🎯 Easy to Use
- Right-click on any selected text
- Choose between translation or explanation
- View instant results in a sleek popup window
- No need to reload the page

## 🛠️ Technical Implementation

### Core Technologies
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI Integration**: Groq API
- **Storage**: Chrome Storage API
- **Security**: Secure API key management

### Architecture
- **Modular Design**: Clean separation of concerns
- **Event-Driven**: Efficient message handling
- **Responsive UI**: Beautiful and intuitive interface
- **Error Handling**: Robust error management

## 🚀 Getting Started

### Prerequisites
- Google Chrome browser
- Groq API key

### Installation
1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

### Configuration
1. Click the extension icon
2. Enter your Groq API key
3. Customize translation settings
4. Start translating!

## 💡 Usage Guide

### Basic Translation
- Select text on any webpage
- Right-click and choose "Translate to Hinglish"
- View the translation in the popup

### AI Explanation
- Select text on any webpage
- Right-click and choose "Explain in Hinglish"
- Get a detailed explanation in your preferred style

### Customizing Settings
- Click the extension icon
- Choose your preferred translation style
- Select your language level
- Save settings

## 🔒 Security Features
- Secure API key storage
- No data collection
- Local processing
- Encrypted communication

## 🛠️ Development

### Project Structure

### Key Components
- `background.js`: Handles API calls and context menu
- `content.js`: Manages page content and translations
- `popup/`: Contains UI components and settings

## 🎯 Performance Optimization
- Efficient API calls
- Minimal memory footprint
- Fast response times
- Optimized UI rendering

## 🔄 Future Enhancements
- Support for more languages
- Batch translation
- Custom translation rules
- Translation history
- Offline mode

## 🤝 Contributing
We welcome contributions! Please read our [Contribution Guidelines](CONTRIBUTING.md) before making any changes.

## 📝 License
This project is licensed under the terms of our [License Agreement](LICENSE.md).

## 🙏 Acknowledgments
- Groq AI for providing the powerful API
- Chrome Extension community for inspiration
- All contributors and users

## 📞 Support
For support, please open an issue in the repository or contact the maintainers.

---

Made with ❤️ by [Om Singh] - A passionate developer dedicated to making language translation accessible to everyone!


Key changes made:
1. Updated the "Contributing" section link to point to `CONTRIBUTING.md`
2. Updated the "License" section link to point to `LICENSE.md`
3. Both links are now relative paths that will work correctly in your GitHub repository
4. Maintained all existing content and formatting while just updating these two links

