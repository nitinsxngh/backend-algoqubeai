import express from 'express';
import {
  createChatbox,
  getChatboxes,
  getChatboxById,
  updateChatbox,
  deleteChatbox,
} from '../controllers/chatbox.controller';

const router = express.Router();

router.post('/', createChatbox); // no multer
router.get('/', getChatboxes);
router.get('/:id', getChatboxById);
router.put('/:id', updateChatbox);
router.delete('/:id', deleteChatbox);

export default router;
