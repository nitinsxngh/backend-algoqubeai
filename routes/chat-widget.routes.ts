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

    const html = `
<!DOCTYPE html>
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
      position: relative;
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
      white-space: pre-wrap;
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

    .lead-form-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .lead-form-container {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 90%;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
    }

    .lead-form-header {
      padding: 16px 20px;
      background: ${themeColor};
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .lead-form-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .lead-form-close {
      background: none;
      border: none;
      color: #ffffff;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lead-form-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .lead-form-content {
      padding: 20px;
      max-height: calc(90vh - 80px);
      overflow-y: auto;
    }

    .lead-form-description {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
      text-align: center;
    }

    .lead-form-field {
      margin-bottom: 16px;
    }

    .lead-form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 6px;
    }

    .lead-form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      font-family: ${textFont};
      outline: none;
      transition: border-color 0.2s;
    }

    .lead-form-input:focus {
      border-color: ${themeColor};
      box-shadow: 0 0 0 2px ${themeColor}20;
    }

    .lead-form-textarea {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      font-family: ${textFont};
      outline: none;
      resize: vertical;
      min-height: 80px;
      transition: border-color 0.2s;
    }

    .lead-form-textarea:focus {
      border-color: ${themeColor};
      box-shadow: 0 0 0 2px ${themeColor}20;
    }

    .lead-form-error {
      color: #e53e3e;
      font-size: 12px;
      margin-top: 4px;
    }

    .lead-form-submit {
      width: 100%;
      padding: 12px 16px;
      background: ${themeColor};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 8px;
      transition: all 0.2s;
    }

    .lead-form-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px ${themeColor}40;
    }

    .lead-form-submit:disabled {
      background: rgba(0, 0, 0, 0.12);
      color: rgba(0, 0, 0, 0.38);
      cursor: not-allowed;
    }

    .lead-form-loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
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
        <div class="bot-subtitle">Powered by algoqube</div>
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
          <div class="message-bubble">Hello! I'm ${displayName}. How can I help you today?</div>
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

    <div class="lead-form-overlay" id="leadFormOverlay" style="display: none;">
      <div class="lead-form-container">
        <div class="lead-form-header">
          <h3 class="lead-form-title">Get in Touch</h3>
          <button class="lead-form-close" id="leadFormClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="lead-form-content">
          <p class="lead-form-description">Please fill out your details and we'll get back to you soon!</p>
          <form id="leadForm">
            <div class="lead-form-field">
              <label class="lead-form-label" for="leadName">Full Name *</label>
              <input type="text" id="leadName" class="lead-form-input" required>
              <div class="lead-form-error" id="leadNameError"></div>
            </div>
            <div class="lead-form-field">
              <label class="lead-form-label" for="leadEmail">Email Address *</label>
              <input type="email" id="leadEmail" class="lead-form-input" required>
              <div class="lead-form-error" id="leadEmailError"></div>
            </div>
            <div class="lead-form-field">
              <label class="lead-form-label" for="leadPhone">Phone Number *</label>
              <input type="tel" id="leadPhone" class="lead-form-input" required>
              <div class="lead-form-error" id="leadPhoneError"></div>
            </div>
            <div class="lead-form-field">
              <label class="lead-form-label" for="leadCompany">Company Name *</label>
              <input type="text" id="leadCompany" class="lead-form-input" required>
              <div class="lead-form-error" id="leadCompanyError"></div>
            </div>
            <div class="lead-form-field">
              <label class="lead-form-label" for="leadMessage">Message (Optional)</label>
              <textarea id="leadMessage" class="lead-form-textarea" rows="3"></textarea>
            </div>
            <button type="submit" class="lead-form-submit" id="leadFormSubmit">
              <span id="leadFormSubmitText">Submit & Continue Chat</span>
              <div class="lead-form-loading" id="leadFormLoading" style="display: none;"></div>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <script>
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messages = document.getElementById('messages');
    
    const leadFormOverlay = document.getElementById('leadFormOverlay');
    const leadForm = document.getElementById('leadForm');
    const leadFormClose = document.getElementById('leadFormClose');
    const leadFormSubmit = document.getElementById('leadFormSubmit');
    const leadFormSubmitText = document.getElementById('leadFormSubmitText');
    const leadFormLoading = document.getElementById('leadFormLoading');
    
    let pendingMessage = '';
    let isSubmittingLead = false;

    function checkForLeadKeywords(message) {
      const leadKeywords = ['contact', 'connect', 'reach out', 'get in touch', 'speak to', 'talk to', 'call me', 'email me'];
      const lowerMessage = message.toLowerCase();
      return leadKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    function showLeadForm(message) {
      pendingMessage = message;
      leadFormOverlay.style.display = 'flex';
      leadForm.reset();
      clearLeadFormErrors();
    }

    function hideLeadForm() {
      leadFormOverlay.style.display = 'none';
      pendingMessage = '';
    }

    function clearLeadFormErrors() {
      const errorElements = document.querySelectorAll('.lead-form-error');
      errorElements.forEach(el => el.textContent = '');
    }

    function showLeadFormError(fieldId, message) {
      const errorElement = document.getElementById(fieldId + 'Error');
      if (errorElement) {
        errorElement.textContent = message;
      }
    }

    function validateLeadForm() {
      clearLeadFormErrors();
      let isValid = true;

      const name = document.getElementById('leadName').value.trim();
      const email = document.getElementById('leadEmail').value.trim();
      const phone = document.getElementById('leadPhone').value.trim();
      const company = document.getElementById('leadCompany').value.trim();

      if (!name) {
        showLeadFormError('leadName', 'Name is required');
        isValid = false;
      }

      if (!email) {
        showLeadFormError('leadEmail', 'Email is required');
        isValid = false;
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        showLeadFormError('leadEmail', 'Please enter a valid email address');
        isValid = false;
      }

      if (!phone) {
        showLeadFormError('leadPhone', 'Phone number is required');
        isValid = false;
      }

      if (!company) {
        showLeadFormError('leadCompany', 'Company name is required');
        isValid = false;
      }

      return isValid;
    }

    function handleLeadFormSubmit(e) {
      e.preventDefault();
      
      if (!validateLeadForm() || isSubmittingLead) return;

      isSubmittingLead = true;
      leadFormSubmit.disabled = true;
      leadFormSubmitText.style.display = 'none';
      leadFormLoading.style.display = 'inline-block';

      addMessage('user', pendingMessage);

      const leadData = {
        name: document.getElementById('leadName').value.trim(),
        email: document.getElementById('leadEmail').value.trim(),
        phone: document.getElementById('leadPhone').value.trim(),
        company: document.getElementById('leadCompany').value.trim(),
        message: document.getElementById('leadMessage').value.trim()
      };

      const leadMessage = \`Thank you for your interest! I've received your contact information:\\n\\nName: \${leadData.name}\\nEmail: \${leadData.email}\\nPhone: \${leadData.phone}\\nCompany: \${leadData.company}\${leadData.message ? \`\\nMessage: \${leadData.message}\` : ''}\\n\\nI'll make sure our team gets back to you soon!\`;
      addMessage('bot', leadMessage);

      console.log('Lead data submitted:', leadData);

      setTimeout(() => {
        isSubmittingLead = false;
        leadFormSubmit.disabled = false;
        leadFormSubmitText.style.display = 'inline';
        leadFormLoading.style.display = 'none';
        hideLeadForm();
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
    leadForm.addEventListener('submit', handleLeadFormSubmit);
    leadFormClose.addEventListener('click', hideLeadForm);

    function sendMessage() {
      const message = messageInput.value.trim();
      if (!message) return;

      if (checkForLeadKeywords(message)) {
        showLeadForm(message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        return;
      }

      addMessage('user', message);
      messageInput.value = '';
      messageInput.style.height = 'auto';
      
      sendButton.disabled = true;
      showTypingIndicator();

      fetch('https://n8n.xendrax.in/webhook/efbc9578-4d9d-4130-9471-87a9fddcdc90', {
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
</html>`;

    res.send(html);
  } catch (error) {
    console.error('[Chat Widget Error]', error);
    res.status(500).send('<p>Failed to load chatbot widget.</p>');
  }
});

export default router;
