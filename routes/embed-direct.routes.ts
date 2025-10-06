// Direct embed approach - loads chatbot content directly without iframe
import express from 'express';
import axios from 'axios';

const router = express.Router();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

router.get('/embed-direct.js', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const chatbotName = req.query.name as string;

  if (!chatbotName) {
    return res.status(400).send('Missing chatbot name');
  }

  try {
    // Get chatbot configuration
    const configRes = await axios.get(`${BACKEND_URL}/api/chatboxes/by-name/${chatbotName}`);
    const chatbox = configRes.data.chatbox || configRes.data;

    if (chatbox.status !== 'active') {
      return res.status(403).send('Chatbot is inactive');
    }

    const {
      themeColor = '#6366f1',
      textFont = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      displayName = 'AI Assistant',
    } = chatbox.configuration || {};

    const script = `
      (function () {
        // Create a completely isolated container
        const container = document.createElement('div');
        container.id = 'algoqube-chatbot-direct-' + Date.now();
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
          font-family: ${textFont} !important;
        \`;

        // Create chatbot HTML directly
        const chatbotHTML = \`
          <div style="
            display: flex;
            flex-direction: column;
            height: 100%;
            background: #ffffff;
            position: relative;
            overflow: hidden;
          ">
            <!-- Header -->
            <div style="
              padding: 16px 20px;
              background: ${themeColor};
              color: #ffffff;
              display: flex;
              align-items: center;
              gap: 12px;
              position: relative;
            ">
              <div style="
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
              ">
                🤖
              </div>
              <div style="flex: 1; margin-right: 8px;">
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 2px;">${displayName}</div>
                <div style="font-size: 11px; opacity: 0.8;">Powered by algoqube</div>
              </div>
              <div style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 500;
                margin-right: 8px;
              ">Online</div>
              <button id="closeBtn" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
                flex-shrink: 0;
              ">×</button>
            </div>

            <!-- Messages -->
            <div id="messages" style="
              flex: 1;
              padding: 16px;
              overflow-y: auto;
              background: #fafafa;
            ">
              <div style="
                margin-bottom: 16px;
                display: flex;
                align-items: flex-start;
                gap: 8px;
              ">
                <div style="
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                  flex-shrink: 0;
                  background: ${themeColor};
                  color: white;
                ">🤖</div>
                <div style="max-width: 70%; position: relative;">
                  <div style="
                    padding: 12px 16px;
                    border-radius: 18px;
                    font-size: 14px;
                    line-height: 1.4;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    background: rgba(0, 0, 0, 0.04);
                    color: #333;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    border-bottom-left-radius: 6px;
                  ">Hello! I'm ${displayName}. How can I help you today?</div>
                  <div style="
                    font-size: 11px;
                    color: #999;
                    margin-top: 4px;
                    text-align: left;
                  ">\${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>

            <!-- Input -->
            <div style="
              padding: 16px 20px;
              background: #ffffff;
              border-top: 1px solid rgba(0, 0, 0, 0.08);
            ">
              <div style="display: flex; align-items: flex-end; gap: 8px;">
                <textarea 
                  id="messageInput" 
                  placeholder="Type your message..."
                  style="
                    flex: 1;
                    padding: 12px 16px;
                    border: none;
                    border-radius: 24px;
                    background: #f8f9fa;
                    font-family: ${textFont};
                    font-size: 14px;
                    resize: none;
                    outline: none;
                    max-height: 120px;
                    min-height: 44px;
                  "
                  rows="1"
                ></textarea>
                <button id="sendButton" style="
                  width: 44px;
                  height: 44px;
                  border: none;
                  border-radius: 50%;
                  background: ${themeColor};
                  color: white;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">→</button>
              </div>
              <div style="
                font-size: 11px;
                color: #999;
                text-align: center;
                margin-top: 8px;
              ">Press Enter to send, Shift+Enter for new line</div>
            </div>
          </div>
        \`;

        container.innerHTML = chatbotHTML;

        // Add event listeners
        const messageInput = container.querySelector('#messageInput');
        const sendButton = container.querySelector('#sendButton');
        const messages = container.querySelector('#messages');
        const closeBtn = container.querySelector('#closeBtn');

        let isTyping = false;

        function addMessage(role, text) {
          const messageDiv = document.createElement('div');
          messageDiv.style.cssText = \`
            margin-bottom: 16px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            \${role === 'user' ? 'justify-content: flex-end;' : ''}
          \`;
          
          const avatar = document.createElement('div');
          avatar.style.cssText = \`
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            flex-shrink: 0;
            background: \${role === 'bot' ? '${themeColor}' : '#6366f1'};
            color: white;
          \`;
          avatar.textContent = role === 'bot' ? '🤖' : '👤';
          
          const content = document.createElement('div');
          content.style.cssText = \`
            max-width: 70%;
            position: relative;
          \`;
          
          const bubble = document.createElement('div');
          bubble.style.cssText = \`
            padding: 12px 16px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
            white-space: pre-wrap;
            \${role === 'user' ? 
              \`background: ${themeColor}; color: white; border-bottom-right-radius: 6px;\` : 
              \`background: rgba(0, 0, 0, 0.04); color: #333; border: 1px solid rgba(0, 0, 0, 0.08); border-bottom-left-radius: 6px;\`
            }
          \`;
          bubble.textContent = text;
          
          const time = document.createElement('div');
          time.style.cssText = \`
            font-size: 11px;
            color: #999;
            margin-top: 4px;
            text-align: \${role === 'user' ? 'right' : 'left'};
          \`;
          time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          content.appendChild(bubble);
          content.appendChild(time);
          messageDiv.appendChild(avatar);
          messageDiv.appendChild(content);
          
          messages.appendChild(messageDiv);
          messages.scrollTop = messages.scrollHeight;
        }

        function sendMessage() {
          const message = messageInput.value.trim();
          if (!message || isTyping) return;

          addMessage('user', message);
          messageInput.value = '';
          messageInput.style.height = 'auto';
          
          sendButton.disabled = true;
          isTyping = true;

          // Simulate bot response
          setTimeout(() => {
            addMessage('bot', 'Thank you for your message! This is a direct embed chatbot that bypasses iframe conflicts.');
            sendButton.disabled = false;
            isTyping = false;
          }, 1000);
        }

        messageInput.addEventListener('input', function() {
          this.style.height = 'auto';
          this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        messageInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        });

        sendButton.addEventListener('click', sendMessage);
        closeBtn.addEventListener('click', () => container.remove());

        // Inject protective CSS
        const style = document.createElement('style');
        style.id = 'algoqube-direct-styles-' + Date.now();
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
          
          #\${container.id} * {
            box-sizing: border-box !important;
          }
          
          #\${container.id} input,
          #\${container.id} textarea,
          #\${container.id} button {
            pointer-events: auto !important;
          }
          
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

        // Add to DOM
        document.body.appendChild(container);

        console.log('[Algoqube Chatbot] Loaded with direct embed method');
      })();
    `;

    res.setHeader('Content-Type', 'application/javascript');
    res.send(script);
  } catch (error) {
    console.error('[Direct Embed Error]', error);
    res.status(500).send('Failed to load chatbot');
  }
});

export default router;
