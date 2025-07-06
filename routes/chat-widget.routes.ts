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

    // ✅ Check chatbot status
    if (chatbox.status !== 'active') {
      return res.status(403).send('<p>This chatbot is inactive or unavailable.</p>');
    }

    const {
      themeColor = '#007BFF',
      textFont = 'sans-serif',
      displayName = 'Chatbot',
      profileAvatar = '',
    } = chatbox.configuration || {};

    // Send full widget HTML
    res.send(`
      <html>
        <head>
          <style>
            body {
              margin: 0;
              font-family: '${textFont}', sans-serif;
            }
            .chatbox {
              padding: 20px;
              max-width: 500px;
              margin: auto;
            }
            #messages {
              margin-bottom: 10px;
              height: 300px;
              overflow-y: auto;
              border: 1px solid #ccc;
              padding: 10px;
              border-radius: 5px;
              background: #f9f9f9;
            }
            .msg {
              margin: 8px 0;
              display: flex;
              align-items: flex-start;
              gap: 10px;
              white-space: pre-wrap;
            }
            .msg-icon {
              width: 20px;
              height: 20px;
              flex-shrink: 0;
            }
            .bot {
              color: ${themeColor};
            }
            .user {
              color: #333;
              font-weight: bold;
            }
            input {
              width: 100%;
              padding: 10px;
              border-radius: 4px;
              border: 1px solid #ccc;
              font-family: '${textFont}', sans-serif;
            }
          </style>
        </head>
        <body>
          <div class="chatbox">
            <h3>${displayName}</h3>
            <div id="messages"></div>
            <input id="input" type="text" placeholder="Type your message..." />
          </div>

          <script>
            const name = "${name}";
            const input = document.getElementById('input');
            const messages = document.getElementById('messages');
            const themeColor = "${themeColor}";

            input.addEventListener('keydown', async (e) => {
              if (e.key === 'Enter' && input.value.trim()) {
                const userMsg = input.value.trim();
                appendMessage('user', userMsg);
                input.value = '';

                try {
                  const res = await fetch('https://sangam.xendrax.in/webhook/efbc9578-4d9d-4130-9471-87a9fddcdc90', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      body: {
                        message: userMsg,
                        context: {
                          website: { url: window.location.origin },
                          chatbotName: name
                        }
                      }
                    })
                  });

                  const data = await res.json();
                  let reply = '[No reply]';

                  if (typeof data === 'string') {
                    reply = data;
                  } else if (Array.isArray(data) && data[0]?.text) {
                    reply = data[0].text;
                  } else if (data?.data) {
                    if (typeof data.data === 'string') {
                      reply = data.data;
                    } else if (Array.isArray(data.data) && data.data[0]?.text) {
                      reply = data.data[0].text;
                    } else {
                      reply = JSON.stringify(data.data);
                    }
                  } else if (data?.output) {
                    reply = data.output;
                  } else if (data?.message) {
                    reply = data.message;
                  } else if (data?.text) {
                    reply = data.text;
                  }

                  appendMessage('bot', reply);
                } catch (err) {
                  appendMessage('bot', '[Error contacting AI agent]');
                  console.error('❌ Chat error:', err);
                }
              }
            });

            function appendMessage(role, text) {
              const div = document.createElement('div');
              div.className = 'msg ' + role;

              const icon = document.createElement('div');
              icon.className = 'msg-icon';
              icon.innerHTML = role === 'bot'
                ? \`<svg xmlns="http://www.w3.org/2000/svg" fill="\${themeColor}" viewBox="0 0 24 24" width="20" height="20"><path d="M12 2a1 1 0 011 1v1.07A8.001 8.001 0 0120 12v3a3 3 0 01-3 3h-1v2h2v2H6v-2h2v-2H7a3 3 0 01-3-3v-3a8.001 8.001 0 017-7.93V3a1 1 0 011-1zm-4 9a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2z"/></svg>\`
                : \`<svg xmlns="http://www.w3.org/2000/svg" fill="#555" viewBox="0 0 24 24" width="20" height="20"><path d="M12 2a5 5 0 110 10 5 5 0 010-10zm-7 17c0-2.761 4.477-4 7-4s7 1.239 7 4v1H5v-1z"/></svg>\`;

              const span = document.createElement('span');
              span.innerText = text;

              div.appendChild(icon);
              div.appendChild(span);
              messages.appendChild(div);
              messages.scrollTop = messages.scrollHeight;
            }
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
