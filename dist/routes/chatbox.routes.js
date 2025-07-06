"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatbox_controller_1 = require("../controllers/chatbox.controller");
const router = express_1.default.Router();
router.post('/', chatbox_controller_1.createChatbox);
router.get('/', chatbox_controller_1.getChatboxes);
router.get('/by-name/:name', chatbox_controller_1.getChatboxByName);
router.get('/:id', chatbox_controller_1.getChatboxById);
router.put('/:id', chatbox_controller_1.updateChatbox);
router.delete('/:id', chatbox_controller_1.deleteChatbox);
router.patch('/:id/configuration', chatbox_controller_1.updateChatboxConfiguration);
exports.default = router;
