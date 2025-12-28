"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const instagram_controller_1 = require("../controllers/instagram.controller");
const router = express_1.default.Router();
// Instagram webhook routes
// GET for webhook verification (Meta requirement)
router.get('/webhook/instagram', instagram_controller_1.verifyWebhook);
// POST for receiving webhook events
router.post('/webhook/instagram', instagram_controller_1.handleWebhook);
exports.default = router;
