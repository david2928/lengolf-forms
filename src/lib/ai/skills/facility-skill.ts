// Facility skill: hours, location, equipment, club rental
// Data source: products.products (is_active=true) + FAQ knowledge base — verified Feb 2026

import { Skill } from './types';

export const facilitySkill: Skill = {
  name: 'facility',
  intents: ['facility_inquiry', 'equipment_inquiry', 'location_inquiry'],
  requiredContext: ['operating_hours'],
  systemPrompt: `FACILITY INFORMATION:
- Location: Bangkok, Thailand
- Equipment: Bravo Golf launch monitors providing comprehensive swing data
- Bay types: Social Bays (up to 5 players), AI Bays (1-2 players with advanced analytics)
- Operating hours: 10:00 AM - 11:00 PM daily, last booking at 10:00 PM
- Peak hours: 6:00 PM - 9:00 PM

EQUIPMENT & SERVICES:
- Launch monitors (Bravo Golf) in every bay
- Standard club rental: FREE (right and left-handed available)
- Premium indoor club rental: ฿150/hr (Premium), ฿250/hr (Premium+)
- Premium course club rental: ฿1,200 (Premium), ฿1,800 (Premium+)
- Club delivery to Bangkok: ฿500
- LENGOLF golf gloves: ฿600
- Food & drinks: Bar service and food available on-site
- Corporate events available: Small (฿9,999), Medium (฿21,999)

LOCATION & ACCESS:
- Address: Mercury Ville, 4th floor, BTS Chidlom (Exit 4)
- Parking: Building has paid parking, but show your Lengolf receipt at the counter and parking is FREE
- Direction from BTS: Take Exit 4 toward Central Embassy side, enter Mercury Ville, 4th floor

COMMON FACILITY QUESTIONS:
- Left-handed support: Yes, we have left-handed clubs (free). AI Bay supports left-handed play.
- What to bring: Nothing needed, we provide everything
- How it works: Hit into a screen with launch monitor tracking your shots
- Club rental: Standard clubs are FREE, premium clubs available for rent

RESPONSE APPROACH:
- These are simple info questions — answer directly, NO function calls needed
- Keep responses brief and friendly`,
  examples: [
    {
      customerMessage: 'มีไม้กอล์ฟให้ยืมมั้ย',
      staffResponse: 'มีค่ะ ยืมฟรีค่ะ',
      language: 'th'
    },
    {
      customerMessage: 'Do you have rental clubs?',
      staffResponse: 'Yes, standard club rental is free with your bay booking! Premium clubs also available from 150 THB/hr.',
      language: 'en'
    },
    {
      customerMessage: 'เปิดกี่โมง',
      staffResponse: 'เปิด 10:00-23:00 ค่ะ จองรอบสุดท้ายได้ถึง 22:00 ค่ะ',
      language: 'th'
    }
  ]
};
