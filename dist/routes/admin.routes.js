"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = require("../middleware/cors");
const router = express_1.default.Router();
// Refresh CORS cache - useful when new domains are added
router.post('/refresh-cors', async (req, res) => {
    try {
        await (0, cors_1.refreshCorsCache)();
        res.json({
            success: true,
            message: 'CORS cache refreshed successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error refreshing CORS cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh CORS cache'
        });
    }
});
// Get current CORS allowed origins (for debugging)
router.get('/cors-origins', async (req, res) => {
    try {
        // Import the function dynamically to avoid circular dependencies
        const { getAllowedOrigins } = await Promise.resolve().then(() => __importStar(require('../middleware/cors')));
        const origins = await getAllowedOrigins();
        res.json({
            success: true,
            origins,
            count: origins.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting CORS origins:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get CORS origins'
        });
    }
});
exports.default = router;
