import { Router } from 'express';
import { createLead, getLeads, updateLead } from '../controllers/lead.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', createLead);
router.get('/', authenticate, getLeads);
router.patch('/:id', authenticate, updateLead);

export default router;

