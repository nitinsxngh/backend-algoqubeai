"use strict";
// routes/scrape.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scrape_controller_1 = require("../controllers/scrape.controller");
const router = express_1.default.Router();
router.post('/scrape', scrape_controller_1.scrapeWebsite);
router.get('/test', scrape_controller_1.testScrape);
exports.default = router;
