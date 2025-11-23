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

          // Create a container div with responsive dimensions
          const container = document.createElement('div');
          const screenHeight = window.innerHeight;
          let maxHeight;
          
          if (screenHeight <= 600) {
            maxHeight = Math.min(450, screenHeight - 20);
          } else if (screenHeight <= 800) {
            maxHeight = Math.min(550, screenHeight - 40);
          } else if (screenHeight <= 1000) {
            maxHeight = Math.min(650, screenHeight - 40);
          } else {
            maxHeight = Math.min(700, screenHeight - 40);
          }
          
          container.style.cssText = \`
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            width: 350px !important;
            height: \${maxHeight}px !important;
            max-height: \${maxHeight}px !important;
            z-index: 99999 !important;
            pointer-events: none !important;
            overflow: hidden !important;
          \`;
          
          // Create iframe with specific dimensions
          const iframe = document.createElement('iframe');
          iframe.src = "${FRONTEND_URL}/chat-widget?" +
            "name=" + encodeURIComponent(chatbox.name) +
            "&themeColor=" + encodeURIComponent(themeColor) +
            "&displayName=" + encodeURIComponent(displayName);

          // Set iframe styles with maximum specificity
          iframe.style.cssText = \`
            width: 350px !important;
            height: \${maxHeight}px !important;
            max-width: 350px !important;
            max-height: \${maxHeight}px !important;
            min-width: 350px !important;
            min-height: 200px !important;
            border: none !important;
            border-radius: 12px !important;
            box-shadow: 0 0 15px rgba(0,0,0,0.2) !important;
            pointer-events: auto !important;
            display: block !important;
            position: relative !important;
            overflow: hidden !important;
          \`;
          
          // Set iframe attributes as backup
          iframe.setAttribute('width', '350');
          iframe.setAttribute('height', maxHeight.toString());
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('scrolling', 'no');
          
          // Add iframe to container
          container.appendChild(iframe);
          
          // Inject CSS to override any conflicting website styles
          const style = document.createElement('style');
          style.textContent = \`
            /* Override the specific conflicting iframe rule */
            iframe[src*="chat-widget"] {
              width: 350px !important;
              height: min(500px, calc(100vh - 40px)) !important;
              max-width: 350px !important;
              max-height: min(500px, calc(100vh - 40px)) !important;
              min-width: 350px !important;
              min-height: 200px !important;
            }
            
            /* Target iframe by src attribute for maximum specificity */
            iframe[src*="aiapi.algoqube.com"] {
              width: 350px !important;
              height: min(500px, calc(100vh - 40px)) !important;
              max-width: 350px !important;
              max-height: min(500px, calc(100vh - 40px)) !important;
              min-width: 350px !important;
              min-height: 200px !important;
            }
            
            /* Override any iframe width: 100% rules */
            iframe[style*="width: 380px"],
            iframe[style*="width: 350px"] {
              width: 350px !important;
              max-width: 350px !important;
              min-width: 350px !important;
            }
            
            /* Most specific selector to override website's iframe rule */
            body iframe[src*="chat-widget"],
            html iframe[src*="chat-widget"],
            * iframe[src*="chat-widget"] {
              width: 350px !important;
              max-width: 350px !important;
              min-width: 350px !important;
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
              height: min(500px, calc(100vh - 40px)) !important;
              max-width: 350px !important;
              max-height: min(500px, calc(100vh - 40px)) !important;
              min-width: 350px !important;
              min-height: 200px !important;
            }
            
            /* Prevent any parent container from affecting the iframe */
            * .algoqube-chatbot-iframe {
              width: 350px !important;
              height: min(500px, calc(100vh - 40px)) !important;
              max-width: 350px !important;
              max-height: min(500px, calc(100vh - 40px)) !important;
              min-width: 350px !important;
              min-height: 200px !important;
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
            
            /* Handle smaller laptop screens */
            @media (max-height: 800px) and (min-width: 768px) {
              iframe[src*="chat-widget"],
              iframe[src*="aiapi.algoqube.com"],
              iframe.algoqube-chatbot-iframe {
                height: min(400px, calc(100vh - 40px)) !important;
                max-height: min(400px, calc(100vh - 40px)) !important;
              }
            }
            
            /* Handle very small laptop screens */
            @media (max-height: 600px) and (min-width: 768px) {
              iframe[src*="chat-widget"],
              iframe[src*="aiapi.algoqube.com"],
              iframe.algoqube-chatbot-iframe {
                height: min(300px, calc(100vh - 20px)) !important;
                max-height: min(300px, calc(100vh - 20px)) !important;
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

          // Function to enforce iframe dimensions
          function enforceIframeDimensions() {
            if (iframe && iframe.style) {
              const screenHeight = window.innerHeight;
              let currentMaxHeight;
              
              if (screenHeight <= 600) {
                currentMaxHeight = Math.min(450, screenHeight - 20);
              } else if (screenHeight <= 800) {
                currentMaxHeight = Math.min(550, screenHeight - 40);
              } else if (screenHeight <= 1000) {
                currentMaxHeight = Math.min(650, screenHeight - 40);
              } else {
                currentMaxHeight = Math.min(700, screenHeight - 40);
              }
              
              // Remove any existing width styles first
              iframe.style.removeProperty('width');
              iframe.style.removeProperty('max-width');
              iframe.style.removeProperty('min-width');
              
              // Set our dimensions with maximum specificity
              iframe.style.setProperty('width', '350px', 'important');
              iframe.style.setProperty('height', currentMaxHeight + 'px', 'important');
              iframe.style.setProperty('max-width', '350px', 'important');
              iframe.style.setProperty('max-height', currentMaxHeight + 'px', 'important');
              iframe.style.setProperty('min-width', '350px', 'important');
              iframe.style.setProperty('min-height', '200px', 'important');
              
              // Also set the iframe attributes as backup
              iframe.setAttribute('width', '350');
              iframe.setAttribute('height', currentMaxHeight.toString());
              
              // Update container height as well
              if (container) {
                container.style.height = currentMaxHeight + 'px';
                container.style.maxHeight = currentMaxHeight + 'px';
              }
              
              // Force a reflow to ensure styles are applied
              iframe.offsetHeight;
            }
          }
          
          // Function to check and fix iframe dimensions
          function checkIframeDimensions() {
            if (iframe) {
              const computedStyle = window.getComputedStyle(iframe);
              const currentWidth = computedStyle.width;
              const currentHeight = computedStyle.height;
              const screenHeight = window.innerHeight;
              let expectedHeight;
              
              if (screenHeight <= 600) {
                expectedHeight = Math.min(450, screenHeight - 20);
              } else if (screenHeight <= 800) {
                expectedHeight = Math.min(550, screenHeight - 40);
              } else if (screenHeight <= 1000) {
                expectedHeight = Math.min(650, screenHeight - 40);
              } else {
                expectedHeight = Math.min(700, screenHeight - 40);
              }
              
              // If width is not 350px or height doesn't match expected, enforce it
              if (currentWidth !== '350px' || parseInt(currentHeight) !== expectedHeight) {
                enforceIframeDimensions();
              }
            }
          }

          // Enforce dimensions immediately and periodically
          enforceIframeDimensions();
          setInterval(enforceIframeDimensions, 1000);
          setInterval(checkIframeDimensions, 500);
          
          // More frequent check specifically for width issues
          setInterval(() => {
            if (iframe) {
              const computedStyle = window.getComputedStyle(iframe);
              if (computedStyle.width !== '350px') {
                enforceIframeDimensions();
              }
            }
          }, 200);

          // Also enforce on window resize
          window.addEventListener('resize', enforceIframeDimensions);
          
          // Listen for messages from the iframe to enforce dimensions
          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'ENFORCE_IFRAME_DIMENSIONS') {
              enforceIframeDimensions();
            }
          });
          
          // Use MutationObserver to detect style changes
          if (window.MutationObserver) {
            const observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || mutation.attributeName === 'width' || mutation.attributeName === 'height')) {
                  setTimeout(enforceIframeDimensions, 10);
                }
              });
            });
            
            // Start observing the iframe for attribute changes
            iframe.addEventListener('load', function() {
              observer.observe(iframe, {
                attributes: true,
                attributeFilter: ['style', 'width', 'height']
              });
            });
          }

          document.body.appendChild(container);
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
