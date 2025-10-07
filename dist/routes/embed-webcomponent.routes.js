"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Alternative approach using Web Component for complete isolation
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.get('/embed-webcomponent.js', (req, res) => {
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

      // Define the custom web component
      class AlgoqubeChatbot extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
          this.loadChatbot();
        }

        static get observedAttributes() {
          return ['name', 'theme-color', 'display-name'];
        }

        async loadChatbot() {
          try {
            const response = await fetch("${BACKEND_URL}/api/chatboxes/by-name/" + this.getAttribute('name'));
            const data = await response.json();
            const chatbox = data.chatbox || data;

            if (!chatbox?.name || !chatbox.configuration) {
              console.error('[Chatbot Embed] Invalid chatbot data structure:', chatbox);
              return;
            }

            const config = chatbox.configuration;
            const themeColor = config.themeColor || '#000000';
            const displayName = config.displayName || 'Chatbot';

            this.render(themeColor, displayName);
          } catch (error) {
            console.error('[Chatbot Embed] Failed to load chatbot:', error);
          }
        }

        render(themeColor, displayName) {
          const iframe = document.createElement('iframe');
          iframe.src = "${FRONTEND_URL}/chat-widget?" +
            "name=" + encodeURIComponent(this.getAttribute('name')) +
            "&themeColor=" + encodeURIComponent(themeColor) +
            "&displayName=" + encodeURIComponent(displayName);

          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '12px';
          iframe.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';

          const style = document.createElement('style');
          style.textContent = \`
            :host {
              position: fixed !important;
              bottom: 20px !important;
              right: 20px !important;
              width: 350px !important;
              height: 500px !important;
              z-index: 99999 !important;
              display: block !important;
              pointer-events: none !important;
            }
            
            iframe {
              width: 100% !important;
              height: 100% !important;
              border: none !important;
              border-radius: 12px !important;
              box-shadow: 0 0 15px rgba(0,0,0,0.2) !important;
              pointer-events: auto !important;
            }
            
            @media (max-width: 768px) {
              :host {
                width: 100vw !important;
                height: 100vh !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                border-radius: 0 !important;
              }
            }
          \`;

          this.shadowRoot.appendChild(style);
          this.shadowRoot.appendChild(iframe);

          // Enforce dimensions periodically
          setInterval(() => {
            this.style.setProperty('width', '350px', 'important');
            this.style.setProperty('height', '500px', 'important');
            this.style.setProperty('max-width', '350px', 'important');
            this.style.setProperty('max-height', '500px', 'important');
          }, 1000);
        }

        connectedCallback() {
          // Ensure dimensions are enforced when connected
          this.style.setProperty('width', '350px', 'important');
          this.style.setProperty('height', '500px', 'important');
          this.style.setProperty('max-width', '350px', 'important');
          this.style.setProperty('max-height', '500px', 'important');
        }
      }

      // Register the custom element
      if (!customElements.get('algoqube-chatbot')) {
        customElements.define('algoqube-chatbot', AlgoqubeChatbot);
      }

      // Create and append the chatbot element
      const chatbot = document.createElement('algoqube-chatbot');
      chatbot.setAttribute('name', chatbotName);
      document.body.appendChild(chatbot);
    })();
  `;
    res.setHeader('Content-Type', 'application/javascript');
    res.send(script);
});
exports.default = router;
