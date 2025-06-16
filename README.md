# 🚀 Hinglish Translator - Chrome Extension

A powerful and intuitive Chrome extension that brings seamless translation and AI-powered explanations to your browsing experience. Transform any English text into Hinglish (Hindi written in English letters) or Hindi with just a right-click!

## ✨ Features

### 🎯 Smart Translation
- **Multiple Translation Styles**
  - Hinglish (Default) – Perfect blend of Hindi and English
  - Hindi (Devanagari) – Pure Hindi script
  - Roman – Hindi in English letters
  - Formal Hinglish – Professional tone
  - Casual Hinglish – Conversational style

### 🎨 Customization Options
- **Language Level Control**
  - Balanced – Equal mix of Hindi and English
  - More Hindi – Hindi-dominant translation
  - More English – English-dominant translation

### 🤖 AI-Powered Features
- **Smart Translation** – Context-aware translations that maintain the original meaning
- **AI Explanations** – Get detailed explanations of selected text in your preferred language style
- **Natural Language Processing** – Powered by advanced Groq AI models

### 🧠 How It Works

#### 🔁 Basic Translation
1. Right-click selected text  
2. Choose "Translate"  
3. See popup with Hinglish result

#### 🤓 AI Explanation
1. Right-click selected text  
2. Choose "Explain"  
3. AI provides context-aware explanation

#### ⚙️ Customizing Settings
1. Go to Extension Options  
2. Select Translation Style  
3. Choose Language Balance  
4. Save Settings

## 🛠️ Technical Implementation

### Core Technologies
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI Integration**: Groq API
- **Storage**: Chrome Storage API
- **Security**: Secure API key management

### Architecture
- **Modular Design** – Clean separation of concerns  
- **Event-Driven** – Efficient message handling  
- **Responsive UI** – Beautiful and intuitive interface  
- **Error Handling** – Robust error management  

### 🧱 Project Structure
- `popup/` – Handles UI and translation display  
- `background/` – Adds context menu, listens for events  
- `content/` – Injects scripts to access webpage text  
- `manifest.json` – Extension metadata and permissions

## 🚀 Getting Started

### Prerequisites
- Google Chrome browser  
- Groq API key

### Installation

1. Clone or download this repository  
2. Open `chrome://extensions/` in Chrome  
3. Enable **Developer mode** (top-right corner)  
4. Click **Load unpacked**  
5. Select the project folder  

## 🧪 Testing

To test functionality:
- Try selecting any English sentence on a web page  
- Right-click → "Translate" or "Explain"  
- Check translation or explanation popup  

## 📦 Future Enhancements

- [ ] Add voice support  
- [ ] Improve Hindi grammar  
- [ ] Support regional dialects  

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request. Make sure to follow the code style and include tests where applicable.

## 📧 Support

For support, please [open an issue](https://github.com/byteom/hinglish-AI-translator/issues) or contact the maintainers.

---

