"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const chatbox_routes_1 = __importDefault(require("./routes/chatbox.routes"));
const embed_routes_1 = __importDefault(require("./routes/embed.routes"));
const embed_webcomponent_routes_1 = __importDefault(require("./routes/embed-webcomponent.routes"));
const embed_popup_routes_1 = __importDefault(require("./routes/embed-popup.routes"));
const chat_widget_routes_1 = __importDefault(require("./routes/chat-widget.routes"));
const scrape_routes_1 = __importDefault(require("./routes/scrape.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const cors_1 = require("./middleware/cors");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Security headers middleware
app.use((req, res, next) => {
    // Check if this is an embed-related route that needs to be frame-able
    const isEmbedRoute = req.path.startsWith('/embed') ||
        req.path.startsWith('/chat-widget') ||
        req.path.startsWith('/widget') ||
        req.path.includes('embed.js') ||
        req.path.includes('widget.js');
    // Set X-Frame-Options based on route type
    if (isEmbedRoute) {
        // Allow embedding for widget/embed routes
        res.header('X-Frame-Options', 'ALLOWALL');
    }
    else {
        // Prevent clickjacking for other routes
        res.header('X-Frame-Options', 'DENY');
    }
    // Prevent MIME type sniffing
    res.header('X-Content-Type-Options', 'nosniff');
    // XSS protection
    res.header('X-XSS-Protection', '1; mode=block');
    // Prevent referrer leakage
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Content Security Policy - more permissive for embed routes
    if (isEmbedRoute) {
        res.header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-src 'self' https:;");
    }
    else {
        res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
    }
    // Remove server information
    res.header('Server', 'Algoqube-AI');
    next();
});
// Dynamic CORS Setup
app.use(cors_1.dynamicCors);
// Body parsing middleware with limits
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});
// API Routes
app.use('/api/users', user_routes_1.default);
app.use('/api/chatboxes', chatbox_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api', scrape_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// Static Embed Scripts
app.use(embed_routes_1.default);
app.use(embed_webcomponent_routes_1.default);
app.use(embed_popup_routes_1.default);
app.use(chat_widget_routes_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});
// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    // Don't leak error details in production
    const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message;
    res.status(500).json({
        error: errorMessage,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});
exports.default = app;
