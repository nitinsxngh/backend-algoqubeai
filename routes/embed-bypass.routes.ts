// Bypass approach - completely avoids iframe conflicts
import express from 'express';

const router = express.Router();

router.get('/embed-bypass.js', (req, res) => {
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

      // Create a completely isolated container using absolute positioning
      const container = document.createElement('div');
      container.id = 'algoqube-chatbot-container-' + Date.now();
      container.style.cssText = \`
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 350px !important;
        height: 500px !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        border-radius: 12px !important;
        box-shadow: 0 0 15px rgba(0,0,0,0.2) !important;
        background: white !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        transform: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        outline: none !important;
        box-sizing: border-box !important;
      \`;

      // Create an object element instead of iframe to bypass iframe CSS rules
      const chatbotFrame = document.createElement('object');
      chatbotFrame.type = 'text/html';
      chatbotFrame.data = "${FRONTEND_URL}/chat-widget?" +
        "name=" + encodeURIComponent(chatbotName) +
        "&themeColor=" + encodeURIComponent('#6366f1') +
        "&displayName=" + encodeURIComponent('AI Assistant');
      
      chatbotFrame.style.cssText = \`
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        pointer-events: auto !important;
        display: block !important;
        position: relative !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      \`;

      // Add object to container
      container.appendChild(chatbotFrame);

      // Inject CSS to protect our container from any global rules
      const style = document.createElement('style');
      style.id = 'algoqube-chatbot-styles-' + Date.now();
      style.textContent = \`
        #\${container.id} {
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          width: 350px !important;
          height: 500px !important;
          z-index: 2147483647 !important;
          pointer-events: none !important;
          overflow: hidden !important;
          border-radius: 12px !important;
          box-shadow: 0 0 15px rgba(0,0,0,0.2) !important;
          background: white !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          transform: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          outline: none !important;
          box-sizing: border-box !important;
        }
        
        #\${container.id} object {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          pointer-events: auto !important;
          display: block !important;
          position: relative !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }
        
        /* Override any global rules that might affect our container */
        * #\${container.id} {
          width: 350px !important;
          height: 500px !important;
          max-width: 350px !important;
          max-height: 500px !important;
          min-width: 350px !important;
          min-height: 500px !important;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
          #\${container.id} {
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
      
      document.head.appendChild(style);

      // Function to enforce container dimensions
      function enforceContainerDimensions() {
        if (container && container.style) {
          container.style.setProperty('width', '350px', 'important');
          container.style.setProperty('height', '500px', 'important');
          container.style.setProperty('max-width', '350px', 'important');
          container.style.setProperty('max-height', '500px', 'important');
          container.style.setProperty('min-width', '350px', 'important');
          container.style.setProperty('min-height', '500px', 'important');
        }
      }

      // Enforce dimensions immediately and periodically
      enforceContainerDimensions();
      setInterval(enforceContainerDimensions, 1000);

      // Add to DOM
      document.body.appendChild(container);

      // Create close button
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '×';
      closeButton.style.cssText = \`
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
        width: 30px !important;
        height: 30px !important;
        border-radius: 50% !important;
        background: rgba(0,0,0,0.5) !important;
        color: white !important;
        border: none !important;
        cursor: pointer !important;
        z-index: 2147483648 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 18px !important;
        font-weight: bold !important;
        pointer-events: auto !important;
      \`;
      
      closeButton.addEventListener('click', () => {
        container.remove();
        style.remove();
      });
      
      container.appendChild(closeButton);

      console.log('[Algoqube Chatbot] Loaded with bypass method');
    })();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.send(script);
});

export default router;
