// Facility skill: hours, location, equipment, club rental
// Detailed FAQs are searchable via search_knowledge tool

import { Skill } from './types';

export const facilitySkill: Skill = {
  name: 'facility',
  intents: ['facility_inquiry', 'equipment_inquiry', 'location_inquiry'],
  requiredContext: ['operating_hours'],
  systemPrompt: `FACILITY:
- Location: Mercury Ville, 4th floor, BTS Chidlom (Exit 4). Parking FREE with Lengolf receipt.
- Hours: 10:00 AM to 11:00 PM daily, last booking 10:00 PM. Peak: 6 to 9 PM.
- Bays: Social (up to 5 players), AI (1-2 players, advanced analytics). Bravo Golf launch monitors.
- Standard clubs: FREE (right and left-handed). Premium clubs available (see pricing).
- Bar with food & drinks on-site. Corporate events available.
- What to bring: Nothing — we provide everything.

No function calls needed for facility questions — just answer directly.`
};
