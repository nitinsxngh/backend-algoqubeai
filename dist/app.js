"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const chatbox_routes_1 = __importDefault(require("./routes/chatbox.routes"));
const embed_routes_1 = __importDefault(require("./routes/embed.routes"));
const chat_widget_routes_1 = __importDefault(require("./routes/chat-widget.routes")); // 👈 Make sure this exists
const app = (0, express_1.default)();
// --- CORS Setup ---
const allowedOrigins = [
    'http://localhost:3000',
    'https://algoqube.com',
    'https://client-algoqubeai.vercel.app/',
    'null', // for file:// access to test locally
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
// --- Body Parser ---
app.use(express_1.default.json());
// --- Cookie Parser ---
app.use((0, cookie_parser_1.default)());
// --- API Routes ---
app.use('/api/users', user_routes_1.default);
app.use('/api/chatboxes', chatbox_routes_1.default);
// --- Embed + Chat Widget Routes ---
app.use(embed_routes_1.default); // Serves /embed.js
app.use(chat_widget_routes_1.default); // Serves /chat-widget
exports.default = app;
