// Pricing skill: pricing questions, packages, promotions
// Data source: products.products (dynamically loaded via pricing-service.ts)

import { Skill } from './types';

export const pricingSkill: Skill = {
  name: 'pricing',
  intents: ['pricing_inquiry', 'promotion_inquiry', 'payment_inquiry', 'booking_request'],
  requiredContext: ['packages', 'bay_pricing'],
  systemPrompt: `PRICING (guides use of search_knowledge for pricing queries — active catalog loaded dynamically):

NEVER quote specific prices without either search_knowledge results or BUSINESS CONTEXT data.

{DYNAMIC_PRICING}

PREMIUM CLUBS: See CLUB RENTAL section for full indoor and course pricing.

PAYMENT: Cash, cards, bank transfer, QR payment.

Active promotions are in the ACTIVE PROMOTIONS section if present — only mention those. Packages and food bundles are NOT promotions.`
};
