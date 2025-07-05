import express from 'express';

const router = express.Router();

router.get('/chat-widget', (req, res) => {
  const { name } = req.query;

  res.send(`
    <html>
      <head>
        <style>
          body { margin: 0; font-family: sans-serif; }
          .chatbox { padding: 20px; max-width: 500px; margin: auto; }
          #messages { margin-bottom: 10px; height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 5px; background: #f9f9f9; }
          .msg { margin: 5px 0; white-space: pre-wrap; }
          .bot { color: #007BFF; }
          .user { color: #333; font-weight: bold; }
          input { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="chatbox">
          <h3>🤖 Chatbot Loaded</h3>
          <p>Chatbot name: <strong>${name}</strong></p>
          <div id="messages"></div>
          <input id="input" type="text" placeholder="Type your message..." />
        </div>

        <script>
          const name = "${name}";
          const input = document.getElementById('input');
          const messages = document.getElementById('messages');

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
                console.log('📥 Webhook response:', data);

                // Try to extract a usable reply
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
            div.innerText = (role === 'bot' ? '🤖 ' : '👤 ') + text;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
          }
        </script>
      </body>
    </html>
  `);
});

export default router;
