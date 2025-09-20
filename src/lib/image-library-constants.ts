/**
 * Constants for the image library system
 */

// Predefined categories for curated images
export const PREDEFINED_CATEGORIES = [
  'Rates',
  'Promotions',
  'Location',
  'Coaching',
  'Others'
] as const;

// Type for category values
export type ImageCategory = typeof PREDEFINED_CATEGORIES[number];

// Category descriptions for staff guidance
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Rates': 'Pricing information, rate cards, special offers',
  'Promotions': 'Marketing materials, discounts, seasonal campaigns',
  'Location': 'Facility photos, maps, directions, amenities',
  'Coaching': 'Golf instruction, tips, tutorials, technique guides',
  'Others': 'General images that don\'t fit other categories'
};

// Common tags suggestions for each category
export const CATEGORY_TAG_SUGGESTIONS: Record<string, string[]> = {
  'Rates': ['pricing', 'rates', 'fees', 'packages', 'membership', 'hourly'],
  'Promotions': ['discount', 'special', 'limited time', 'offer', 'sale', 'campaign'],
  'Location': ['facility', 'driving range', 'clubhouse', 'parking', 'directions', 'map'],
  'Coaching': ['instruction', 'tips', 'tutorial', 'technique', 'swing', 'lesson'],
  'Others': ['general', 'info', 'announcement', 'notice', 'contact', 'hours']
};

// Validation constants
export const MAX_CATEGORIES = 20; // Prevent category explosion
export const MAX_CATEGORY_LENGTH = 50;
export const MAX_TAGS_PER_IMAGE = 10;
export const MAX_TAG_LENGTH = 30;