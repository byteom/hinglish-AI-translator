// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translatePage") {
        translatePageContent();
    }
});

// Function to translate the entire page
async function translatePageContent() {
    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.position = 'fixed';
    progressContainer.style.top = '10px';
    progressContainer.style.right = '10px';
    progressContainer.style.padding = '10px';
    progressContainer.style.backgroundColor = '#1a73e8';
    progressContainer.style.color = 'white';
    progressContainer.style.borderRadius = '4px';
    progressContainer.style.zIndex = '9999';
    progressContainer.style.minWidth = '200px';
    progressContainer.style.fontFamily = 'Arial, sans-serif';
    
    // Create progress text
    const progressText = document.createElement('div');
    progressText.textContent = 'Translating page: 0%';
    progressText.style.marginBottom = '8px';
    
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    progressBar.style.height = '8px';
    progressBar.style.borderRadius = '4px';
    progressBar.style.overflow = 'hidden';
    
    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = '#ffffff';
    progressFill.style.transition = 'width 0.3s ease-in-out';
    
    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressText);
    progressContainer.appendChild(progressBar);
    document.body.appendChild(progressContainer);

    try {
        // Get user preference for translation mode
        const { translationMode } = await chrome.storage.local.get(['translationMode']);
        const mode = translationMode || 'paragraphs';
        
        let translatedCount = 0;
        let totalElements = 0;

        if (mode === 'paragraphs') {
            translatedCount = await translateParagraphs(progressText, progressFill);
            totalElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div').length;
        } else {
            translatedCount = await translateAllText(progressText, progressFill);
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            while (walker.nextNode()) {
                if (walker.currentNode.textContent.trim() && 
                    walker.currentNode.parentElement && 
                    !walker.currentNode.parentElement.classList.contains('hinglish-translated')) {
                    totalElements++;
                }
            }
        }

        progressText.textContent = 'Translation complete!';
        progressContainer.style.backgroundColor = '#0b8043';
        progressFill.style.width = '100%';
        setTimeout(() => progressContainer.remove(), 2000);
    } catch (error) {
        console.error('Translation error:', error);
        progressText.textContent = 'Translation failed!';
        progressContainer.style.backgroundColor = '#d93025';
        setTimeout(() => progressContainer.remove(), 2000);
    }
}

// Translate paragraph by paragraph
async function translateParagraphs(progressText, progressFill) {
    const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div');
    let translatedCount = 0;
    const totalElements = paragraphs.length;
    
    for (const element of paragraphs) {
        if (element.textContent.trim() && 
            element.childNodes.length === 1 && 
            element.childNodes[0].nodeType === Node.TEXT_NODE &&
            !element.classList.contains('hinglish-translated')) {
            
            const originalText = element.textContent;
            
            try {
                const response = await chrome.runtime.sendMessage({
                    action: "translateText",
                    text: originalText
                });
                
                if (response && response !== "Please configure your API key first") {
                    element.textContent = response;
                    element.classList.add('hinglish-translated');
                    translatedCount++;
                    const progress = Math.round((translatedCount / totalElements) * 100);
                    progressText.textContent = `Translating page: ${progress}%`;
                    progressFill.style.width = `${progress}%`;
                }
            } catch (error) {
                console.error('Translation error:', error);
            }
        }
    }
    
    return translatedCount;
}

// Translate all text nodes (more aggressive approach)
async function translateAllText(progressText, progressFill) {
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
    const totalElements = textNodes.length;
    
    for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
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
                const progress = Math.round((translatedCount / totalElements) * 100);
                progressText.textContent = `Translating page: ${progress}%`;
                progressFill.style.width = `${progress}%`;
            }
        } catch (error) {
            console.error('Translation error:', error);
        }
    }
    
    return translatedCount;
}