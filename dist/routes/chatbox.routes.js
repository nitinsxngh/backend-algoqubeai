"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatbox_controller_1 = require("../controllers/chatbox.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes (no authentication required) - MUST come before parameterized routes
router.get('/analyze-colors', chatbox_controller_1.analyzeWebsiteColors);
router.post('/increment-visit', chatbox_controller_1.incrementWebsiteVisits);
router.get('/by-name/:name', chatbox_controller_1.getChatboxByName); // Public route for embed.js
router.post('/encrypt-email', chatbox_controller_1.encryptEmail); // Encrypt email for secure URLs
router.get('/decrypt-email/:token', chatbox_controller_1.decryptEmail); // Decrypt email token
// Protected routes (require authentication)
router.post('/', auth_1.authenticate, chatbox_controller_1.createChatbox);
router.get('/', auth_1.authenticate, chatbox_controller_1.getChatboxes);
router.get('/:id', auth_1.authenticate, chatbox_controller_1.getChatboxById);
router.put('/:id', auth_1.authenticate, chatbox_controller_1.updateChatbox);
router.delete('/:id', auth_1.authenticate, chatbox_controller_1.deleteChatbox);
router.patch('/:id/configuration', auth_1.authenticate, chatbox_controller_1.updateChatboxConfiguration);
exports.default = router;
