// routes/scrape.routes.ts

import express from 'express';
import { scrapeWebsite, testScrape } from '../controllers/scrape.controller';

const router = express.Router();

router.post('/scrape', scrapeWebsite);
router.get('/test', testScrape);

export default router;