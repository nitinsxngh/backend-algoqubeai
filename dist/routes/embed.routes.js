"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/embed.ts or embed.js
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.get('/embed.js', (req, res) => {
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

      fetch("${BACKEND_URL}/api/chatboxes/by-name/" + chatbotName)
        .then(res => {
          if (!res.ok) throw new Error('Chatbot not found');
          return res.json();
        })
        .then(data => {
          const chatbox = data.chatbox || data;

          if (!chatbox?.name || !chatbox.configuration) {
            console.error('[Chatbot Embed] Invalid chatbot data structure:', chatbox);
            return;
          }

          const config = chatbox.configuration;
          const themeColor = config.themeColor || '#000000';
          const displayName = config.displayName || 'Chatbot';

          const iframe = document.createElement('iframe');
          iframe.src = "${FRONTEND_URL}/chat-widget?" +
            "name=" + encodeURIComponent(chatbox.name) +
            "&themeColor=" + encodeURIComponent(themeColor) +
            "&displayName=" + encodeURIComponent(displayName);

          iframe.style.position = 'fixed';
          iframe.style.bottom = '20px';
          iframe.style.right = '20px';
          iframe.style.width = '350px';
          iframe.style.height = '500px';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '12px';
          iframe.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
          iframe.style.zIndex = '99999';

          document.body.appendChild(iframe);
        })
        .catch(err => {
          console.error('[Chatbot Embed] Failed to load chatbot:', err);
        });
    })();
  `;
    res.setHeader('Content-Type', 'application/javascript');
    res.send(script);
});
exports.default = router;
