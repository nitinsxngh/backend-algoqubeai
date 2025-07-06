import express from 'express';
import {
  createChatbox,
  getChatboxes,
  getChatboxById,
  updateChatbox,
  deleteChatbox,
  getChatboxByName,
  updateChatboxConfiguration,
} from '../controllers/chatbox.controller';

const router = express.Router();
router.post('/', createChatbox);
router.get('/', getChatboxes);
router.get('/by-name/:name', getChatboxByName); 
router.get('/:id', getChatboxById);
router.put('/:id', updateChatbox);
router.delete('/:id', deleteChatbox);
router.patch('/:id/configuration', updateChatboxConfiguration);

export default router;
