import express from 'express';
import {
  createChatbox,
  getChatboxes,
  getChatboxById,
  updateChatbox,
  deleteChatbox,
  getChatboxByName,
  updateChatboxConfiguration,
  incrementWebsiteVisits,
  analyzeWebsiteColors,
  encryptEmail,
  decryptEmail,
  uploadOrganizationImage,
  uploadDocument,
  uploadDocumentForCreation,
  getPredefinedQuestions,
  addPredefinedQuestion,
  updatePredefinedQuestion,
  deletePredefinedQuestion,
} from '../controllers/chatbox.controller';
import { authenticate } from '../middleware/auth';
import { uploadImage, uploadDocument as uploadDocumentMiddleware } from '../middleware/upload';

const router = express.Router();

// Public routes (no authentication required) - MUST come before parameterized routes
router.get('/analyze-colors', analyzeWebsiteColors);
router.post('/increment-visit', incrementWebsiteVisits);
router.get('/by-name/:name', getChatboxByName); // Public route for embed.js
router.post('/encrypt-email', encryptEmail); // Encrypt email for secure URLs
router.get('/decrypt-email/:token', decryptEmail); // Decrypt email token

// Protected routes (require authentication)
router.post('/', authenticate, createChatbox);
router.post('/upload-document', authenticate, uploadDocumentMiddleware.array('documents', 10), uploadDocumentForCreation);
router.get('/', authenticate, getChatboxes);
router.post('/:id/upload-image', authenticate, uploadImage.single('image'), uploadOrganizationImage);
router.post('/:id/upload-document', authenticate, uploadDocumentMiddleware.array('documents', 10), uploadDocument);
router.get('/:id', authenticate, getChatboxById);
router.put('/:id', authenticate, updateChatbox);
router.delete('/:id', authenticate, deleteChatbox);
router.patch('/:id/configuration', authenticate, updateChatboxConfiguration);

// Predefined questions routes
router.get('/:id/predefined-questions', authenticate, getPredefinedQuestions);
router.post('/:id/predefined-questions', authenticate, addPredefinedQuestion);
router.put('/:id/predefined-questions/:questionId', authenticate, updatePredefinedQuestion);
router.delete('/:id/predefined-questions/:questionId', authenticate, deletePredefinedQuestion);

export default router;
