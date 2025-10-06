// routes/embed.ts or embed.js
import express from 'express';

const router = express.Router();

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

          // Create a Shadow DOM container for complete isolation
          const shadowHost = document.createElement('div');
          shadowHost.style.position = 'fixed';
          shadowHost.style.bottom = '20px';
          shadowHost.style.right = '20px';
          shadowHost.style.width = '350px';
          shadowHost.style.height = '500px';
          shadowHost.style.zIndex = '99999';
          shadowHost.style.pointerEvents = 'none';
          
          // Create shadow root for complete CSS isolation
          const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
          
          // Create iframe inside shadow DOM
          const iframe = document.createElement('iframe');
          iframe.src = "${FRONTEND_URL}/chat-widget?" +
            "name=" + encodeURIComponent(chatbox.name) +
            "&themeColor=" + encodeURIComponent(themeColor) +
            "&displayName=" + encodeURIComponent(displayName);

          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '12px';
          iframe.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
          iframe.style.pointerEvents = 'auto';
          
          // Add iframe to shadow DOM
          shadowRoot.appendChild(iframe);
          
          // Add CSS to shadow DOM for complete isolation
          const shadowStyle = document.createElement('style');
          shadowStyle.textContent = \`
            :host {
              position: fixed !important;
              bottom: 20px !important;
              right: 20px !important;
              width: 350px !important;
              height: 500px !important;
              z-index: 99999 !important;
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
          shadowRoot.appendChild(shadowStyle);
          
          // Inject CSS to override any conflicting website styles
          const style = document.createElement('style');
          style.textContent = \`
            .algoqube-chatbot-iframe {
              width: 350px !important;
              height: 500px !important;
              max-width: 350px !important;
              max-height: 500px !important;
              min-width: 350px !important;
              min-height: 500px !important;
              position: fixed !important;
              bottom: 20px !important;
              right: 20px !important;
              border: none !important;
              border-radius: 12px !important;
              box-shadow: 0 0 15px rgba(0,0,0,0.2) !important;
              z-index: 99999 !important;
              overflow: hidden !important;
            }
            
            /* Override the specific conflicting CSS rule */
            iframe.algoqube-chatbot-iframe[style*="width"] {
              width: 350px !important;
            }
            
            /* Additional protection against width: 100% !important */
            iframe[class*="algoqube-chatbot-iframe"] {
              width: 350px !important;
              max-width: 350px !important;
              min-width: 350px !important;
            }
            
            /* Additional protection against common CSS resets */
            iframe.algoqube-chatbot-iframe {
              width: 350px !important;
              height: 500px !important;
              max-width: 350px !important;
              max-height: 500px !important;
              min-width: 350px !important;
              min-height: 500px !important;
            }
            
            /* Prevent any parent container from affecting the iframe */
            * .algoqube-chatbot-iframe {
              width: 350px !important;
              height: 500px !important;
              max-width: 350px !important;
              max-height: 500px !important;
              min-width: 350px !important;
              min-height: 500px !important;
            }
            
            /* Specific override for the conflicting iframe rule */
            iframe.algoqube-chatbot-iframe {
              width: 350px !important;
              max-width: 350px !important;
              min-width: 350px !important;
            }
            
            /* Override any iframe width: 100% !important rules */
            iframe[class*="algoqube"] {
              width: 350px !important;
              max-width: 350px !important;
              min-width: 350px !important;
            }
            
            /* Most specific selector to override website's iframe rule */
            body iframe.algoqube-chatbot-iframe,
            html iframe.algoqube-chatbot-iframe,
            * iframe.algoqube-chatbot-iframe {
              width: 350px !important;
              max-width: 350px !important;
              min-width: 350px !important;
            }
            
            /* Mobile responsive behavior */
            @media (max-width: 768px) {
              .algoqube-chatbot-iframe {
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                min-width: 100vw !important;
                min-height: 100vh !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                border-radius: 0 !important;
              }
            }
            
            @media (max-width: 480px) {
              .algoqube-chatbot-iframe {
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                min-width: 100vw !important;
                min-height: 100vh !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                border-radius: 0 !important;
              }
            }
          \`;
          document.head.appendChild(style);

          // Function to enforce shadow host dimensions
          function enforceShadowDimensions() {
            if (shadowHost && shadowHost.style) {
              // Enforce shadow host dimensions
              shadowHost.style.setProperty('width', '350px', 'important');
              shadowHost.style.setProperty('height', '500px', 'important');
              shadowHost.style.setProperty('max-width', '350px', 'important');
              shadowHost.style.setProperty('max-height', '500px', 'important');
              shadowHost.style.setProperty('min-width', '350px', 'important');
              shadowHost.style.setProperty('min-height', '500px', 'important');
              
              // Force a reflow to ensure styles are applied
              shadowHost.offsetHeight;
            }
          }
          
          // Function to check and fix shadow host dimensions
          function checkShadowDimensions() {
            if (shadowHost) {
              const computedStyle = window.getComputedStyle(shadowHost);
              const currentWidth = computedStyle.width;
              const currentHeight = computedStyle.height;
              
              // If width is not 350px, enforce it
              if (currentWidth !== '350px') {
                enforceShadowDimensions();
              }
            }
          }

          // Enforce dimensions immediately and periodically
          enforceShadowDimensions();
          setInterval(enforceShadowDimensions, 1000);
          setInterval(checkShadowDimensions, 500);
          
          // More frequent check specifically for width issues
          setInterval(() => {
            if (shadowHost) {
              const computedStyle = window.getComputedStyle(shadowHost);
              if (computedStyle.width !== '350px') {
                enforceShadowDimensions();
              }
            }
          }, 200);

          // Also enforce on window resize
          window.addEventListener('resize', enforceShadowDimensions);
          
          // Listen for messages from the iframe to enforce dimensions
          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'ENFORCE_IFRAME_DIMENSIONS') {
              enforceShadowDimensions();
            }
          });
          
          // Use MutationObserver to detect style changes
          if (window.MutationObserver) {
            const observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || mutation.attributeName === 'width' || mutation.attributeName === 'height')) {
                  setTimeout(enforceShadowDimensions, 10);
                }
              });
            });
            
            // Start observing the shadow host for attribute changes
            iframe.addEventListener('load', function() {
              observer.observe(shadowHost, {
                attributes: true,
                attributeFilter: ['style', 'width', 'height']
              });
            });
          }

          document.body.appendChild(shadowHost);
        })
        .catch(err => {
          console.error('[Chatbot Embed] Failed to load chatbot:', err);
        });
    })();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.send(script);
});

export default router;
