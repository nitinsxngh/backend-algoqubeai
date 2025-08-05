import express from 'express';
import axios from 'axios';

const router = express.Router();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

router.get('/chat-widget', async (req, res) => {
  const { name } = req.query;

  try {
    const configRes = await axios.get(
        `${BACKEND_URL}/api/chatboxes/by-name/${name}`
      );

    const chatbox = configRes.data.chatbox || configRes.data;

    if (chatbox.status !== 'active') {
      return res.status(403).send('<p>This chatbot is inactive or unavailable.</p>');
    }

    const {
      themeColor = '#6366f1',
      textFont = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      displayName = 'AI Assistant',
    } = chatbox.configuration || {};

    res.send(`
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${displayName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: ${textFont};
              background: #ffffff;
              height: 100vh;
              overflow: hidden;
            }

            .chat-container {
              display: flex;
              flex-direction: column;
              height: 100vh;
              background: #ffffff;
            }

            .chat-header {
              padding: 16px 20px;
              background: ${themeColor};
              color: #ffffff;
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .bot-avatar {
              width: 32px;
              height: 32px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            }

            .header-info {
              flex: 1;
            }

            .bot-name {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 2px;
            }

            .bot-subtitle {
              font-size: 11px;
              opacity: 0.8;
            }

            .status-chip {
              background: rgba(255, 255, 255, 0.2);
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 500;
            }

            .messages-container {
              flex: 1;
              padding: 16px;
              overflow-y: auto;
              background: #fafafa;
            }

            .messages-container::-webkit-scrollbar {
              width: 6px;
            }

            .messages-container::-webkit-scrollbar-track {
              background: transparent;
            }

            .messages-container::-webkit-scrollbar-thumb {
              background: rgba(0, 0, 0, 0.2);
              border-radius: 3px;
            }

            .message {
              margin-bottom: 16px;
              display: flex;
              align-items: flex-start;
              gap: 8px;
            }

            .message.user {
              justify-content: flex-end;
            }

            .message-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              flex-shrink: 0;
            }

            .message.user .message-avatar {
              background: #6366f1;
              color: white;
            }

            .message.bot .message-avatar {
              background: ${themeColor};
              color: white;
            }

            .message-content {
              max-width: 70%;
              position: relative;
            }

            .message-bubble {
              padding: 12px 16px;
              border-radius: 18px;
              font-size: 14px;
              line-height: 1.4;
              word-wrap: break-word;
            }

            .message.user .message-bubble {
              background: ${themeColor};
              color: white;
              border-bottom-right-radius: 6px;
            }

            .message.bot .message-bubble {
              background: rgba(0, 0, 0, 0.04);
              color: #333;
              border: 1px solid rgba(0, 0, 0, 0.08);
              border-bottom-left-radius: 6px;
            }

            .message-time {
              font-size: 11px;
              color: #999;
              margin-top: 4px;
              text-align: right;
            }

            .message.user .message-time {
              text-align: right;
            }

            .message.bot .message-time {
              text-align: left;
            }

            .input-container {
              padding: 16px 20px;
              background: #ffffff;
              border-top: 1px solid rgba(0, 0, 0, 0.08);
            }

            .input-wrapper {
              display: flex;
              align-items: flex-end;
              gap: 8px;
            }

            .message-input {
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
            }

            .message-input:focus {
              background: #ffffff;
              box-shadow: 0 0 0 2px ${themeColor}20;
            }

            .send-button {
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
            }

            .send-button:hover:not(:disabled) {
              opacity: 0.9;
            }

            .send-button:disabled {
              background: rgba(0, 0, 0, 0.12);
              color: rgba(0, 0, 0, 0.38);
              cursor: not-allowed;
            }

            .input-hint {
              font-size: 11px;
              color: #999;
              text-align: center;
              margin-top: 8px;
            }

            .typing-indicator {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 10px 14px;
              background: rgba(0, 0, 0, 0.04);
              border-radius: 18px;
              border: 1px solid rgba(0, 0, 0, 0.08);
              border-bottom-left-radius: 6px;
              max-width: 70%;
            }

            .typing-text {
              font-size: 12px;
              color: #666;
              font-weight: 500;
            }

            .typing-dots {
              display: flex;
              gap: 3px;
            }

            .typing-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #999;
              animation: typing 1.4s infinite ease-in-out;
            }

            .typing-dot:nth-child(1) { animation-delay: -0.32s; }
            .typing-dot:nth-child(2) { animation-delay: -0.16s; }

            @keyframes typing {
              0%, 80%, 100% {
                transform: scale(0.8);
                opacity: 0.5;
              }
              40% {
                transform: scale(1);
                opacity: 1;
              }
            }

            @media (max-width: 480px) {
              .message-content {
                max-width: 85%;
              }
              
              .chat-header {
                padding: 12px 16px;
              }
              
              .messages-container {
                padding: 12px;
              }
              
              .input-container {
                padding: 12px 16px;
              }
            }
          </style>
        </head>
        <body>
          <div class="chat-container">
            <div class="chat-header">
              <div class="bot-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </div>
              <div class="header-info">
                <div class="bot-name">${displayName}</div>
                <div class="bot-subtitle">Powered by advanced AI</div>
              </div>
              <div class="status-chip">Online</div>
            </div>

            <div class="messages-container" id="messages">
              <div class="message bot">
                <div class="message-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </div>
                <div class="message-content">
                  <div class="message-bubble">
                    Hello! I'm ${displayName}. How can I help you today?
                  </div>
                  <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>

            <div class="input-container">
              <div class="input-wrapper">
                <textarea 
                  class="message-input" 
                  id="messageInput" 
                  placeholder="Type your message..."
                  rows="1"
                ></textarea>
                <button class="send-button" id="sendButton">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                  </svg>
                </button>
              </div>
              <div class="input-hint">Press Enter to send, Shift+Enter for new line</div>
            </div>
          </div>

          <script>
            const messageInput = document.getElementById('messageInput');
            const sendButton = document.getElementById('sendButton');
            const messages = document.getElementById('messages');

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

            function sendMessage() {
              const message = messageInput.value.trim();
              if (!message) return;

              addMessage('user', message);
              messageInput.value = '';
              messageInput.style.height = 'auto';
              
              sendButton.disabled = true;
              showTypingIndicator();

              fetch('https://sangam.xendrax.in/webhook/efbc9578-4d9d-4130-9471-87a9fddcdc90', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  body: {
                    message: message,
                    context: {
                      website: { 
                        url: window.location.origin,
                        domain: '${chatbox.domainUrl || window.location.origin}',
                        organization: '${chatbox.organizationName || 'Organisation'}',
                        category: '${chatbox.category || 'General'}'
                      },
                      chatbotName: '${chatbox.name || 'general-chatbot'}',
                      chatbotId: '${chatbox._id || ''}'
                    }
                  }
                })
              })
              .then(res => res.json())
              .then(data => {
                sendButton.disabled = false;
                hideTypingIndicator();
                
                let reply = "I apologize, but I'm having trouble processing your request right now.";
                
                if (typeof data === 'string') {
                  reply = data;
                } else if (Array.isArray(data) && data[0] && data[0].text) {
                  reply = data[0].text;
                } else if (data && data.data) {
                  if (typeof data.data === 'string') {
                    reply = data.data;
                  } else if (Array.isArray(data.data) && data.data[0] && data.data[0].text) {
                    reply = data.data[0].text;
                  } else {
                    reply = JSON.stringify(data.data);
                  }
                } else if (data && data.output) {
                  reply = data.output;
                } else if (data && data.message) {
                  reply = data.message;
                } else if (data && data.text) {
                  reply = data.text;
                }

                addMessage('bot', reply);
              })
              .catch(err => {
                sendButton.disabled = false;
                hideTypingIndicator();
                addMessage('bot', 'Sorry, I am experiencing technical difficulties. Please try again later.');
                console.error('Chat error:', err);
              });
            }

            function addMessage(role, text) {
              const messageDiv = document.createElement('div');
              messageDiv.className = 'message ' + role;
              
              const avatar = document.createElement('div');
              avatar.className = 'message-avatar';
              
              if (role === 'bot') {
                avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
              } else {
                avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
              }
              
              const content = document.createElement('div');
              content.className = 'message-content';
              
              const bubble = document.createElement('div');
              bubble.className = 'message-bubble';
              bubble.textContent = text;
              
              const time = document.createElement('div');
              time.className = 'message-time';
              time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              content.appendChild(bubble);
              content.appendChild(time);
              messageDiv.appendChild(avatar);
              messageDiv.appendChild(content);
              
              messages.appendChild(messageDiv);
              scrollToBottom();

              // Send message to parent window for tracking
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'CHAT_MESSAGE',
                  role: role,
                  content: text
                }, '*');
              }
            }

            function showTypingIndicator() {
              const typingDiv = document.createElement('div');
              typingDiv.className = 'message bot';
              typingDiv.id = 'typingIndicator';
              
              const avatar = document.createElement('div');
              avatar.className = 'message-avatar';
              avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
              
              const content = document.createElement('div');
              content.className = 'message-content';
              
              const bubble = document.createElement('div');
              bubble.className = 'typing-indicator';
              bubble.innerHTML = '<span class="typing-text">Thinking</span><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
              
              content.appendChild(bubble);
              typingDiv.appendChild(avatar);
              typingDiv.appendChild(content);
              
              messages.appendChild(typingDiv);
              scrollToBottom();
            }

            function hideTypingIndicator() {
              const typingIndicator = document.getElementById('typingIndicator');
              if (typingIndicator) {
                typingIndicator.remove();
              }
            }

            function scrollToBottom() {
              messages.scrollTop = messages.scrollHeight;
            }

            messageInput.focus();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('[Chat Widget Error]', error);
    res.status(500).send('<p>Failed to load chatbot widget.</p>');
  }
});

export default router;
