export interface Plan {
  id: string;
  name: string;
  price: number;
  tokenLimit: number;
  features: string[];
  description: string;
  popular?: boolean;
  color: string;
}

export const PLANS: Plan[] = [
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

export const getPlanById = (id: string): Plan | undefined => {
  return PLANS.find(plan => plan.id === id);
};

export const getPlanTokenLimit = (planId: string): number => {
  const plan = getPlanById(planId);
  return plan ? plan.tokenLimit : 1000; // Default to free plan
};

export const initializeUserTokens = (planId: string) => {
  const tokenLimit = getPlanTokenLimit(planId);
  return {
    allocated: tokenLimit,
    used: 0,
    remaining: tokenLimit
  };
}; 