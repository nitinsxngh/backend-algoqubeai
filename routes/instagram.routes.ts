import express from 'express';
import { verifyWebhook, handleWebhook } from '../controllers/instagram.controller';

const router = express.Router();

// Instagram webhook routes
// GET for webhook verification (Meta requirement)
router.get('/webhook/instagram', verifyWebhook);

// POST for receiving webhook events
router.post('/webhook/instagram', handleWebhook);

export default router;

