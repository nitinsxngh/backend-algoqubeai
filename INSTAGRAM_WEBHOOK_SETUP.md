# Instagram Webhook Setup Guide

This guide explains how to set up the Instagram webhook for automated message responses.

## Overview

The Instagram webhook endpoint is located at:
- **URL**: `https://aiapi.algoqube.com/webhook/instagram`
- **Verify Token**: `22578cf6b6008a0faacdd7f55186759e5f86371e`

## Features

- ✅ Webhook verification (GET request)
- ✅ Receives incoming Instagram messages (POST request)
- ✅ Processes messages using AI webhook processor
- ✅ Sends automated responses back to Instagram users

## Environment Variables

Add the following variables to your `.env` file:

```env
# Instagram Configuration
INSTAGRAM_VERIFY_TOKEN=22578cf6b6008a0faacdd7f55186759e5f86371e
INSTAGRAM_ACCESS_TOKEN=your-instagram-access-token
INSTAGRAM_PAGE_ID=your-instagram-page-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret

# Message Processor Webhook (for AI responses)
MESSAGE_PROCESSOR_WEBHOOK_URL=https://your-webhook-url/webhook/efbc9578-4d9d-4130-9471-87a9fddcdc90
```

## How to Get Instagram Credentials

1. **Instagram Access Token**: 
   - Go to Meta App Dashboard → Instagram → Basic Display
   - Generate a long-lived access token
   - Or use the token generated in the "Generate access tokens" section

2. **Instagram Page ID**:
   - This is your Instagram Business Account ID
   - You can find it in the Meta App Dashboard → Instagram → Basic Display
   - It's the same as your Facebook Page ID if connected

3. **Instagram App Secret**:
   - Found in Meta App Dashboard → Settings → Basic
   - Keep this secret secure

## Webhook Configuration in Meta Dashboard

1. Go to Meta App Dashboard → Instagram → Webhooks
2. Set the callback URL: `https://aiapi.algoqube.com/webhook/instagram`
3. Set the verify token: `22578cf6b6008a0faacdd7f55186759e5f86371e`
4. Subscribe to the following webhook fields:
   - `messages`
   - `messaging_postbacks` (optional)
   - `messaging_optins` (optional)

## How It Works

1. **Webhook Verification** (GET request):
   - Meta sends a GET request to verify the webhook
   - The endpoint checks the verify token and returns the challenge

2. **Message Processing** (POST request):
   - When a user sends a message on Instagram, Meta sends a POST request
   - The webhook extracts the message text
   - Sends the message to the AI processor webhook
   - Gets the AI-generated response
   - Sends the response back to the Instagram user via Graph API

## API Endpoints

### GET /webhook/instagram
Webhook verification endpoint (required by Meta).

**Query Parameters:**
- `hub.mode`: Should be "subscribe"
- `hub.verify_token`: Should match `INSTAGRAM_VERIFY_TOKEN`
- `hub.challenge`: Random string from Meta

**Response:**
- Returns the `hub.challenge` value if verification succeeds
- Returns 403 if verification fails

### POST /webhook/instagram
Receives webhook events from Instagram.

**Request Body:**
```json
{
  "object": "instagram",
  "entry": [
    {
      "messaging": [
        {
          "sender": {
            "id": "instagram-user-psid"
          },
          "recipient": {
            "id": "page-id"
          },
          "timestamp": 1234567890,
          "message": {
            "mid": "message-id",
            "text": "Hello!"
          }
        }
      ]
    }
  ]
}
```

**Response:**
- Always returns 200 OK immediately (Meta requires response within 20 seconds)
- Processing happens asynchronously

## Testing

1. **Test Webhook Verification**:
   ```bash
   curl "https://aiapi.algoqube.com/webhook/instagram?hub.mode=subscribe&hub.verify_token=22578cf6b6008a0faacdd7f55186759e5f86371e&hub.challenge=test123"
   ```
   Should return: `test123`

2. **Test Message Processing**:
   - Send a message to your Instagram Business account
   - Check server logs for processing confirmation
   - Verify that you receive an automated response

## Troubleshooting

### Webhook Verification Fails
- Check that `INSTAGRAM_VERIFY_TOKEN` matches the token in Meta Dashboard
- Ensure the endpoint is publicly accessible
- Check server logs for verification attempts

### Messages Not Being Processed
- Verify `INSTAGRAM_ACCESS_TOKEN` is valid and has required permissions
- Check that `INSTAGRAM_PAGE_ID` is correct
- Ensure `MESSAGE_PROCESSOR_WEBHOOK_URL` is accessible
- Check server logs for error messages

### Responses Not Sending
- Verify the access token has `instagram_business_basic` and `instagram_manage_messages` permissions
- Check that the Page ID is correct
- Ensure the recipient ID (sender PSID) is valid
- Check Instagram Graph API error responses in logs

## Required Permissions

Your Instagram app needs the following permissions:
- `instagram_business_basic`
- `instagram_manage_comments`
- `instagram_business_manage_messages`

## Security Notes

- Keep `INSTAGRAM_VERIFY_TOKEN` and `INSTAGRAM_APP_SECRET` secure
- Use HTTPS for webhook URLs
- Validate webhook signatures (optional but recommended)
- Rate limit webhook processing to prevent abuse

## Support

For issues or questions, contact: connect@algoqube.com

