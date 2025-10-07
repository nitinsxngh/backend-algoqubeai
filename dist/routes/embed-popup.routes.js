"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Alternative approach using popup window for complete isolation
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.get('/embed-popup.js', (req, res) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
    const script = `
    (function () {
      const scriptTag = document.currentScript;
      const chatbotName = scriptTag?.getAttribute('data-name');

      if (!chatbotName) {
        console.error('[Chatbot Embed] Missing data-name attribute in script tag.');
        return;
      }

      let popup = null;
      let isOpen = false;

      // Create floating button
      const button = document.createElement('button');
      button.innerHTML = \`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      \`;
      
      button.style.cssText = \`
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        background: #6366f1 !important;
        color: white !important;
        border: none !important;
        cursor: pointer !important;
        z-index: 99999 !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.3s ease !important;
      \`;

      button.addEventListener('click', () => {
        if (isOpen && popup && !popup.closed) {
          popup.close();
          isOpen = false;
        } else {
          openChatbot();
        }
      });

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
      });

      async function openChatbot() {
        try {
          const response = await fetch("${BACKEND_URL}/api/chatboxes/by-name/" + chatbotName);
          const data = await response.json();
          const chatbox = data.chatbox || data;

          if (!chatbox?.name || !chatbox.configuration) {
            console.error('[Chatbot Embed] Invalid chatbot data structure:', chatbox);
            return;
          }

          const config = chatbox.configuration;
          const themeColor = config.themeColor || '#6366f1';
          const displayName = config.displayName || 'AI Assistant';

          // Calculate popup position (centered on screen)
          const width = 400;
          const height = 600;
          const left = (screen.width - width) / 2;
          const top = (screen.height - height) / 2;

          popup = window.open(
            \`\${"${FRONTEND_URL}"}/chat-widget?name=\${encodeURIComponent(chatbox.name)}&themeColor=\${encodeURIComponent(themeColor)}&displayName=\${encodeURIComponent(displayName)}\`,
            'algoqube-chatbot',
            \`width=\${width},height=\${height},left=\${left},top=\${top},scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no\`
          );

          if (popup) {
            isOpen = true;
            
            // Check if popup is closed
            const checkClosed = setInterval(() => {
              if (popup.closed) {
              isOpen = false;
              clearInterval(checkClosed);
            }
          }, 1000);

          // Listen for messages from popup
          window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'CLOSE_CHAT') {
              popup.close();
              isOpen = false;
            }
          });
        }
      } catch (error) {
        console.error('[Chatbot Embed] Failed to load chatbot:', error);
      }
    }

    document.body.appendChild(button);
  })();
  `;
    res.setHeader('Content-Type', 'application/javascript');
    res.send(script);
});
exports.default = router;
