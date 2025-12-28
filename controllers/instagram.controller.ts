import { Request, Response } from 'express';
import axios from 'axios';

const INSTAGRAM_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || '22578cf6b6008a0faacdd7f55186759e5f86371e';
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || '';
const INSTAGRAM_PAGE_ID = process.env.INSTAGRAM_PAGE_ID || ''; // Instagram Business Account ID (Page ID)
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || '';
const MESSAGE_PROCESSOR_WEBHOOK_URL = process.env.MESSAGE_PROCESSOR_WEBHOOK_URL || 'http://localhost:5001/webhook/efbc9578-4d9d-4130-9471-87a9fddcdc90';
const INSTAGRAM_GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

/**
 * @route   GET /webhook/instagram
 * @desc    Verify Instagram webhook (Meta requires this for webhook setup)
 */
export const verifyWebhook = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[Instagram Webhook] Verification request:', { mode, token, challenge });

    // Check if mode and token are valid
    if (mode === 'subscribe' && token === INSTAGRAM_VERIFY_TOKEN) {
      console.log('[Instagram Webhook] Webhook verified successfully');
      // Respond with the challenge token
      res.status(200).send(challenge);
    } else {
      console.log('[Instagram Webhook] Verification failed - Invalid token or mode');
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('[Instagram Webhook] Verification error:', error);
    res.status(500).send('Internal Server Error');
  }
};

/**
 * @route   POST /webhook/instagram
 * @desc    Handle incoming Instagram messages
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // Respond immediately to Meta (within 20 seconds)
    res.status(200).send('OK');

    const body = req.body;

    console.log('[Instagram Webhook] Received webhook:', JSON.stringify(body, null, 2));

    // Handle different webhook types
    if (body.object === 'instagram') {
      // Process each entry
      if (body.entry && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          // Handle messaging events
          if (entry.messaging && Array.isArray(entry.messaging)) {
            for (const event of entry.messaging) {
              await processMessage(event);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Instagram Webhook] Error processing webhook:', error);
    // Don't send error response as we already sent 200 OK
  }
};

/**
 * Process incoming Instagram message
 */
async function processMessage(event: any) {
  try {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const timestamp = event.timestamp;
    const message = event.message;

    // Only process text messages
    if (!message || !message.text) {
      console.log('[Instagram Webhook] Skipping non-text message');
      return;
    }

    const messageText = message.text;
    const messageId = message.mid;

    console.log('[Instagram Webhook] Processing message:', {
      senderId,
      messageText: messageText.substring(0, 100),
      messageId,
    });

    // Get AI response from webhook processor
    const aiResponse = await getAIResponse(messageText);

    // Send response back to Instagram
    await sendMessage(senderId, aiResponse);

    console.log('[Instagram Webhook] Message processed and response sent');
  } catch (error) {
    console.error('[Instagram Webhook] Error processing message:', error);
  }
}

/**
 * Get AI response from message processor webhook
 */
async function getAIResponse(messageText: string): Promise<string> {
  try {
    const response = await axios.post(
      MESSAGE_PROCESSOR_WEBHOOK_URL,
      {
        body: {
          message: messageText,
          context: {
            website: {
              url: 'https://aiapi.algoqube.com',
              domain: 'aiapi.algoqube.com',
              organization: 'QubeAI',
              category: 'AI Assistant',
            },
            chatbotName: 'instagram-chatbot',
            chatbotId: 'instagram',
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // Extract response text from various possible formats
    let reply = "I apologize, but I'm having trouble processing your request right now.";

    if (typeof response.data === 'string') {
      reply = response.data;
    } else if (response.data?.text) {
      reply = response.data.text;
    } else if (response.data?.data) {
      if (typeof response.data.data === 'string') {
        reply = response.data.data;
      } else if (Array.isArray(response.data.data) && response.data.data[0]?.text) {
        reply = response.data.data[0].text;
      }
    } else if (response.data?.message) {
      reply = response.data.message;
    } else if (response.data?.output) {
      reply = response.data.output;
    }

    return reply;
  } catch (error) {
    console.error('[Instagram Webhook] Error getting AI response:', error);
    return "I'm sorry, I'm experiencing technical difficulties. Please try again later.";
  }
}

/**
 * Send message to Instagram user via Graph API
 */
async function sendMessage(recipientId: string, messageText: string) {
  try {
    if (!INSTAGRAM_ACCESS_TOKEN) {
      console.error('[Instagram Webhook] Instagram access token not configured');
      return;
    }

    if (!INSTAGRAM_PAGE_ID) {
      console.error('[Instagram Webhook] Instagram Page ID not configured');
      return;
    }

    // Use the page ID to send messages
    const url = `${INSTAGRAM_GRAPH_API_URL}/${INSTAGRAM_PAGE_ID}/messages`;

    const payload = {
      recipient: {
        id: recipientId,
      },
      message: {
        text: messageText,
      },
      messaging_type: 'RESPONSE',
      access_token: INSTAGRAM_ACCESS_TOKEN,
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('[Instagram Webhook] Message sent successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[Instagram Webhook] Error sending message:', error.response?.data || error.message);
    throw error;
  }
}

