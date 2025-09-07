"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeUserTokens = exports.getPlanTokenLimit = exports.getPlanById = exports.PLANS = void 0;
exports.PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        tokenLimit: 1000,
        features: [
            '1,000 tokens per month',
            'Basic AI chat support',
            'Standard response time',
            'Community support'
        ],
        description: 'Perfect for getting started with AI chatbots',
        color: '#6b7280'
    },
    {
        id: 'starter',
        name: 'Starter',
        price: 49,
        tokenLimit: 5000,
        features: [
            '5,000 tokens per month',
            'Advanced AI capabilities',
            'Faster response times',
            'Email support',
            'Custom chatbot themes',
            'Basic analytics'
        ],
        description: 'Great for small businesses and startups',
        color: '#3b82f6'
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 99,
        tokenLimit: 50000,
        features: [
            '50,000 tokens per month',
            'Premium AI models',
            'Ultra-fast responses',
            'Priority support',
            'Advanced customization',
            'Detailed analytics',
            'Multiple chatbots',
            'API access'
        ],
        description: 'Ideal for growing businesses and teams',
        popular: true,
        color: '#8b5cf6'
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 0, // Contact sales
        tokenLimit: 0, // Unlimited
        features: [
            'Unlimited tokens',
            'Custom AI models',
            'Dedicated support',
            'Custom integrations',
            'Advanced security',
            'SLA guarantees',
            'On-premise options',
            'Custom training'
        ],
        description: 'For large organizations with custom needs',
        color: '#10b981'
    }
];
const getPlanById = (id) => {
    return exports.PLANS.find(plan => plan.id === id);
};
exports.getPlanById = getPlanById;
const getPlanTokenLimit = (planId) => {
    const plan = (0, exports.getPlanById)(planId);
    return plan ? plan.tokenLimit : 1000; // Default to free plan
};
exports.getPlanTokenLimit = getPlanTokenLimit;
const initializeUserTokens = (planId) => {
    const tokenLimit = (0, exports.getPlanTokenLimit)(planId);
    return {
        allocated: tokenLimit,
        used: 0,
        remaining: tokenLimit
    };
};
exports.initializeUserTokens = initializeUserTokens;
