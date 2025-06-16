// Handle context menu for highlighted text translation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateToHinglish",
    title: "Translate to Hinglish",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "explainInHinglish",
    title: "Explain in Hinglish",
    contexts: ["selection"],
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translateText") {
    translateText(request.text)
      .then(sendResponse)
      .catch((error) => {
        console.error("Translation error:", error);
        sendResponse("Translation error: " + error.message);
      });
    return true; // Required for async sendResponse
  }
  if (request.action === "explainText") {
    explainText(request.text)
      .then(sendResponse)
      .catch((error) => {
        console.error("Explanation error:", error);
        sendResponse("Explanation error: " + error.message);
      });
    return true; // Required for async sendResponse
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translateToHinglish" && info.selectionText) {
    try {
      // Show loading popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showLoadingPopup,
        args: [],
      });

      const translatedText = await translateText(info.selectionText);

      // Remove loading popup and show translation
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showTranslationPopup,
        args: [info.selectionText, translatedText],
      });
    } catch (error) {
      console.error("Context menu translation error:", error);
      // Show error in popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showErrorPopup,
        args: [error.message],
      });
    }
  } else if (info.menuItemId === "explainInHinglish" && info.selectionText) {
    try {
      // Show loading popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showLoadingPopup,
        args: [],
      });

      const explanation = await explainText(info.selectionText);

      // Remove loading popup and show explanation
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showExplanationPopup,
        args: [info.selectionText, explanation],
      });
    } catch (error) {
      console.error("Context menu explanation error:", error);
      // Show error in popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showErrorPopup,
        args: [error.message],
      });
    }
  }
});

// Function to get translation prompt based on style and level
function getTranslationPrompt(style, level) {
  const prompts = {
    hinglish: {
      balanced:
        "You are a translator that converts English text to Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural in Hinglish. Use a balanced mix of Hindi and English words. Only respond with the translated text, no explanations.",
      moreHindi:
        "You are a translator that converts English text to Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural in Hinglish. Use more Hindi words than English. Only respond with the translated text, no explanations.",
      moreEnglish:
        "You are a translator that converts English text to Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural in Hinglish. Use more English words than Hindi. Only respond with the translated text, no explanations.",
    },
    hindi: {
      balanced:
        "You are a translator that converts English text to Hindi (Devanagari script). Keep the meaning exactly the same but make it sound natural in Hindi. Use a balanced mix of formal and colloquial Hindi. Only respond with the translated text, no explanations.",
      moreHindi:
        "You are a translator that converts English text to Hindi (Devanagari script). Keep the meaning exactly the same but make it sound natural in Hindi. Use more formal Hindi words. Only respond with the translated text, no explanations.",
      moreEnglish:
        "You are a translator that converts English text to Hindi (Devanagari script). Keep the meaning exactly the same but make it sound natural in Hindi. Use more colloquial Hindi words. Only respond with the translated text, no explanations.",
    },
    roman: {
      balanced:
        "You are a translator that converts Hindi text to Romanized Hindi (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural. Use a balanced mix of formal and colloquial words. Only respond with the translated text, no explanations.",
      moreHindi:
        "You are a translator that converts Hindi text to Romanized Hindi (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural. Use more formal words. Only respond with the translated text, no explanations.",
      moreEnglish:
        "You are a translator that converts Hindi text to Romanized Hindi (Hindi written in English letters). Keep the meaning exactly the same but make it sound natural. Use more colloquial words. Only respond with the translated text, no explanations.",
    },
    formal: {
      balanced:
        "You are a translator that converts English text to formal Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound professional and formal. Use a balanced mix of Hindi and English words. Only respond with the translated text, no explanations.",
      moreHindi:
        "You are a translator that converts English text to formal Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound professional and formal. Use more Hindi words than English. Only respond with the translated text, no explanations.",
      moreEnglish:
        "You are a translator that converts English text to formal Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound professional and formal. Use more English words than Hindi. Only respond with the translated text, no explanations.",
    },
    casual: {
      balanced:
        "You are a translator that converts English text to casual Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound casual and conversational. Use a balanced mix of Hindi and English words. Only respond with the translated text, no explanations.",
      moreHindi:
        "You are a translator that converts English text to casual Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound casual and conversational. Use more Hindi words than English. Only respond with the translated text, no explanations.",
      moreEnglish:
        "You are a translator that converts English text to casual Hinglish (Hindi written in English letters). Keep the meaning exactly the same but make it sound casual and conversational. Use more English words than Hindi. Only respond with the translated text, no explanations.",
    },
  };

  return prompts[style][level] || prompts.hinglish.balanced;
}

// Function to translate text using Groq API
async function translateText(text) {
  const { groqApiKey, translationSettings } = await chrome.storage.local.get([
    "groqApiKey",
    "translationSettings",
  ]);

  if (!groqApiKey) {
    throw new Error("Please configure your API key first");
  }

  const style = translationSettings?.style || "hinglish";
  const level = translationSettings?.level || "balanced";
  const prompt = getTranslationPrompt(style, level);

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: prompt,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API error: ${response.status}`
      );
    }

    const data = await response.json();
    const translatedText = data.choices[0].message.content.trim();

    if (!translatedText) {
      throw new Error("Empty translation received");
    }

    return translatedText;
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

// Function to explain text using Groq API
async function explainText(text) {
  const { groqApiKey, translationSettings } = await chrome.storage.local.get([
    "groqApiKey",
    "translationSettings",
  ]);

  if (!groqApiKey) {
    throw new Error("Please configure your API key first");
  }

  const style = translationSettings?.style || "hinglish";
  const level = translationSettings?.level || "balanced";
  const prompt = `You are an AI assistant that explains concepts in ${
    style === "hindi" ? "Hindi" : "Hinglish"
  }. 
    Provide a clear and detailed explanation of the given text. 
    Make it easy to understand and use ${
      level === "moreHindi"
        ? "more Hindi words"
        : level === "moreEnglish"
        ? "more English words"
        : "a balanced mix of Hindi and English words"
    }.
    Format your response in a clear, structured way with bullet points or short paragraphs.
    Only respond with the explanation, no additional text.`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: prompt,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API error: ${response.status}`
      );
    }

    const data = await response.json();
    const explanation = data.choices[0].message.content.trim();

    if (!explanation) {
      throw new Error("Empty explanation received");
    }

    return explanation;
  } catch (error) {
    console.error("Explanation error:", error);
    throw error;
  }
}

// Function to show loading popup
function showLoadingPopup() {
  const popup = document.createElement("div");
  popup.id = "translationLoadingPopup";
  popup.style.position = "fixed";
  popup.style.zIndex = "9999";
  popup.style.borderRadius = "8px";
  popup.style.padding = "20px";
  popup.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  popup.style.maxWidth = "300px";
  popup.style.fontFamily = "Arial, sans-serif";
  popup.style.fontSize = "14px";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.textAlign = "center";

  // Dark mode detection and styling
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    popup.style.backgroundColor = "#2d2d2d";
    popup.style.color = "#ffffff";
    popup.style.border = "1px solid #444";
  } else {
    popup.style.backgroundColor = "#ffffff";
    popup.style.color = "#333333";
    popup.style.border = "1px solid #ddd";
  }

  popup.innerHTML = `
    <div style="margin-bottom: 15px; font-size: 15px;">Processing...</div>
    <div class="loading-spinner" style="
      width: 30px;
      height: 30px;
      border: 3px solid rgba(0,0,0,0.1);
      border-top: 3px solid #1a73e8;
      border-radius: 50%;
      margin: 0 auto;
      animation: spin 1s linear infinite;
    "></div>
  `;

  // Add the animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(popup);
}

// Function to show translation popup
function showTranslationPopup(originalText, translatedText) {
  // Remove loading popup if it exists
  const loadingPopup = document.getElementById("translationLoadingPopup");
  if (loadingPopup) {
    document.body.removeChild(loadingPopup);
  }

  const popup = document.createElement("div");
  popup.className = "hinglish-popup";
  popup.style.position = "fixed";
  popup.style.zIndex = "9999";
  popup.style.borderRadius = "12px";
  popup.style.padding = "24px";
  popup.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.15)";
  popup.style.maxWidth = "420px";
  popup.style.width = "90%";
  popup.style.fontFamily = "Inter, Arial, sans-serif";
  popup.style.fontSize = "15px";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.transition = "all 0.3s ease";

  // Unified light/dark mode UI
  popup.style.backgroundColor = "#ffffff";
  popup.style.color = "#000000";
  popup.style.border = "1px solid #e0e0e0";

  // Apply modern minimal HTML
  popup.innerHTML = `
  <div style="margin-bottom: 20px;">
    <div style="font-weight: 600; margin-bottom: 6px; color: #444;">Original</div>
    <div style="background: #f9f9f9; padding: 12px 16px; border-radius: 8px; line-height: 1.6;">${originalText}</div>
  </div>
  <div style="margin-bottom: 20px;">
    <div style="font-weight: 600; margin-bottom: 6px; color: #444;">Translation</div>
    <div style="background: #e8f0fe; padding: 12px 16px; border-radius: 8px; line-height: 1.6;">${translatedText}</div>
  </div>
  <div style="text-align: right;">
    <button id="closePopup" style="
      padding: 8px 20px;
      background: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    ">Close</button>
  </div>
`;

  document.body.appendChild(popup);

  // Close button functionality
  const closeButton = popup.querySelector("#closePopup");
  closeButton.addEventListener("click", () => {
    document.body.removeChild(popup);
  });

  // Hover effect for close button
  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.background = "#0d5bc1";
  });
  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.background = "#1a73e8";
  });

  // Close when clicking outside
  document.addEventListener("click", function outsideClick(e) {
    if (!popup.contains(e.target)) {
      document.body.removeChild(popup);
      document.removeEventListener("click", outsideClick);
    }
  });
}

// Function to show explanation popup
function showExplanationPopup(originalText, explanation) {
  // Remove loading popup if it exists
  const loadingPopup = document.getElementById("translationLoadingPopup");
  if (loadingPopup) {
    document.body.removeChild(loadingPopup);
  }

  const popup = document.createElement("div");
  popup.className = "hinglish-popup";
  popup.style.position = "fixed";
  popup.style.zIndex = "9999";
  popup.style.borderRadius = "10px";
  popup.style.padding = "20px";
  popup.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
  popup.style.maxWidth = "500px";
  popup.style.width = "90%";
  popup.style.fontFamily = "Arial, sans-serif";
  popup.style.fontSize = "14px";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";

  // 🌙 Light/Dark Theme Detection
  const isDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  popup.style.backgroundColor = isDarkMode ? "#1e1e1e" : "#ffffff";
  popup.style.color = isDarkMode ? "#f1f1f1" : "#000000";
  popup.style.border = isDarkMode ? "1px solid #333333" : "1px solid #e0e0e0";

  popup.innerHTML = `
  <div style="margin-bottom: 15px;">
    <div style="font-weight: bold; margin-bottom: 8px; color: ${
      isDarkMode ? "#ccc" : "#555"
    }">Original Text:</div>
    <div style="background: ${
      isDarkMode ? "#2a2a2a" : "#f5f5f5"
    }; padding: 12px; border-radius: 6px; margin-bottom: 15px; line-height: 1.5;">${originalText}</div>

    <div style="font-weight: bold; margin-bottom: 8px; color: ${
      isDarkMode ? "#ccc" : "#555"
    }">AI Explanation:</div>
    <div style="background: ${
      isDarkMode ? "#0d2c53" : "#e8f0fe"
    }; padding: 12px; border-radius: 6px; line-height: 1.5; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${explanation}</div>
  </div>

  <div style="text-align: right;">
    <button id="closePopup" style="
      cursor: pointer;
      padding: 8px 16px;
      background: #1a73e8;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      transition: background 0.2s;
    ">Close</button>
  </div>
`;

  document.body.appendChild(popup);

  // Close button functionality
  const closeButton = popup.querySelector("#closePopup");
  closeButton.addEventListener("click", () => {
    document.body.removeChild(popup);
  });

  // Hover effect for close button
  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.background = "#0d5bc1";
  });
  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.background = "#1a73e8";
  });

  // Close when clicking outside
  document.addEventListener("click", function outsideClick(e) {
    if (!popup.contains(e.target)) {
      document.body.removeChild(popup);
      document.removeEventListener("click", outsideClick);
    }
  });
}

// Function to show error popup
function showErrorPopup(errorMessage) {
  // Remove loading popup if it exists
  const loadingPopup = document.getElementById("translationLoadingPopup");
  if (loadingPopup) {
    document.body.removeChild(loadingPopup);
  }

  const popup = document.createElement("div");
  popup.className = "hinglish-popup";
  popup.style.position = "fixed";
  popup.style.zIndex = "9999";
  popup.style.borderRadius = "8px";
  popup.style.padding = "20px";
  popup.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  popup.style.maxWidth = "300px";
  popup.style.fontFamily = "Arial, sans-serif";
  popup.style.fontSize = "14px";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";

  // Dark mode detection and styling
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    popup.style.backgroundColor = "#2d2d2d";
    popup.style.color = "#ffffff";
    popup.style.border = "1px solid #444";

    popup.innerHTML = `
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px; color: #ff6b6b;">Error:</div>
        <div style="margin-bottom: 15px; line-height: 1.5;">${errorMessage}</div>
      </div>
      <div style="text-align: right;">
        <button id="closePopup" style="
          cursor: pointer;
          padding: 8px 16px;
          background: #d93025;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          transition: background 0.2s;
        ">Close</button>
      </div>
    `;
  } else {
    popup.style.backgroundColor = "#ffffff";
    popup.style.color = "#333333";
    popup.style.border = "1px solid #ddd";

    popup.innerHTML = `
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px; color: #d93025;">Error:</div>
        <div style="margin-bottom: 15px; line-height: 1.5;">${errorMessage}</div>
      </div>
      <div style="text-align: right;">
        <button id="closePopup" style="
          cursor: pointer;
          padding: 8px 16px;
          background: #d93025;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          transition: background 0.2s;
        ">Close</button>
      </div>
    `;
  }

  document.body.appendChild(popup);

  // Close button functionality
  const closeButton = popup.querySelector("#closePopup");
  closeButton.addEventListener("click", () => {
    document.body.removeChild(popup);
  });

  // Hover effect for close button
  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.background = "#c5221f";
  });
  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.background = "#d93025";
  });

  // Auto close after 5 seconds
  setTimeout(() => {
    if (document.body.contains(popup)) {
      document.body.removeChild(popup);
    }
  }, 5000);
}
