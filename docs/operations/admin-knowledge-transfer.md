# LENGOLF Admin Knowledge Transfer Guide

> Compiled from operational experience (Dec 2025 - Mar 2026), AI knowledge base, and live database records. This document covers everything a new LINE/WhatsApp admin needs to know to handle customer inquiries, bookings, coaching, club rentals, events, and day-to-day operations.

---

## About LENGOLF

**LENGOLF** is a premium indoor golf simulator and bar in Bangkok, Thailand.

- **Location:** The Mercury Ville @ BTS Chidlom (Exit 4), Floor 4, 540 Ploenchit Road, Lumpini, Pathumwan, Bangkok 10330
- **Hours:** 9:00 AM to 11:00 PM daily (from April 1, 2026). Last booking at 10:00 PM. Peak hours: 6-9 PM.
- **Phone:** 096-668-2335
- **Email:** info@len.golf
- **LINE:** @lengolf
- **Website:** https://len.golf
- **Self-Booking:** https://booking.len.golf

### Facility
- **4 simulator bays** with Korean Bravo Golf simulators (99% accuracy swing tracking)
  - Bays 1-3: Social Bays (up to 5 players each)
  - Bay 4: AI Bay / Uneekor (1-2 players, advanced analytics, dual camera)
- All bays have club speed tracking with video
- Auto tee system on all bays
- 100+ championship courses (Pebble Beach, TPC Sawgrass, etc.)
- Large putting green with realistic slopes
- Full bar with food and beverages, food service to bays
- 50+ person event space capacity
- **3 hours free parking** with LENGOLF receipt
- What to bring: Nothing - we provide everything (free standard clubs with every booking)

---

## Table of Contents

1. [Tools & Access](#1-tools--access)
2. [Booking Operations](#2-booking-operations)
3. [Customer Management](#3-customer-management)
4. [Pricing & Bay Rates](#4-pricing--bay-rates)
5. [Promotions & Packages](#5-promotions--packages)
6. [Coaching](#6-coaching)
7. [Club Rentals](#7-club-rentals)
8. [Events & Parties](#8-events--parties)
9. [Communication Guidelines](#9-communication-guidelines)
10. [Administrative Tasks](#10-administrative-tasks)
11. [Common Scenarios & How to Handle Them](#11-common-scenarios--how-to-handle-them)
12. [Important Rules & Pitfalls](#12-important-rules--pitfalls)

---

## 1. Tools & Access

### Primary Tools
| Tool | Purpose | URL/Access |
|------|---------|------------|
| **Unified Chat** | LINE + IG/FB customer messaging | https://lengolf-forms.vercel.app/staff/unified-chat |
| **Meta Business Suite** | WhatsApp messages ONLY | Mobile app (Meta) |
| **Booking Calendar** | View/edit/cancel bookings | Via unified chat or admin panel |
| **Coaching Assist** | Check coach availability | https://lengolf-forms.vercel.app/coaching-assist |
| **Package Monitor** | Check customer packages/usage | https://lengolf-forms.vercel.app/package-monitor |
| **LINE OA Manager** | Access to official LINE account | Via LINE Business invite |

### Channel Routing (CRITICAL)

| Channel | Where to Reply | Notes |
|---------|---------------|-------|
| **LINE** | Unified Chat | Never reply from LINE OA directly |
| **Facebook Messenger** | Unified Chat | Never reply from Meta Business Suite |
| **Instagram DMs** | Unified Chat | Never reply from Instagram app directly |
| **WhatsApp** | Meta Business Suite app | Only channel NOT in Unified Chat |

**Why this matters:** If you reply from the wrong tool, the response won't be tracked in our system. This means other staff can't see what was said, and the AI assistant won't have context for future suggestions.

- If the chat interface glitches or freezes, clear browser cache or restart the browser.
- WhatsApp messages appear in the Meta Business Suite mobile app (download from App Store/Play Store).

### AI Suggestion Feature
- There is an AI assistant built into the chat that suggests replies.
- Triggered by clicking the icon on the right side of the chat.
- **Always double-check AI suggestions before sending** - it can make mistakes (wrong prices, wrong availability, etc.).
- The AI can also help with creating bookings and customers.
- If a suggested reply looks odd (especially Thai language), edit it before sending.

---

## 2. Booking Operations

### Creating a Booking
1. **Customer must exist first** - If the customer is new, create them before making a booking.
2. To create a customer: click on their profile in the chat, then use the create customer option.
3. Required for new customer: Phone number + Name.
4. Select the booking date, time, duration, and bay.
5. Add any special notes (e.g., "B1G1", "left handed", "premium clubs", "free trial").
6. Booking confirmation is sent automatically - no need to send manually.

### Bay Assignment
- **Social Bays (1-3)**: Standard bays, default for most bookings.
- **AI Bay (Bay 4 / Uneekor)**: Premium bay with more metrics and dual camera.
- All bays have club speed with video. AI bay has additional metrics.
- Don't ask customers which bay they prefer unless they specifically request one.
- **Never mention bay numbers to customers** when discussing availability. Say "this hour would be with working auto tee" or similar.

### Editing & Cancelling Bookings
- To edit: click on the customer name in the booking calendar, then edit.
- To change times significantly: cancel the old booking and create a new one.
- **Always send cancellation notifications through the system** (click cancel from the booking - it notifies automatically).
- When cancelling, also notify the customer in the chat.

### Booking Website (Self-Service)
- Customers can self-book at: **https://booking.len.golf/**
- Instant confirmation.
- Recommend this to customers who want to browse availability themselves.
- Booking can be made up to ~3 months in advance (no strict max date).

---

## 3. Customer Management

### Linking Customers
- **Always try to link customers** to their LINE/IG profile when possible.
- This enables sending booking confirmations and notifications directly.
- When searching for a customer, if the phone number starts with 0, try removing the leading 0.
- If you can't find a customer, they may be under a similar/different name - search by phone number.

### Checking Customer History
- Click on a customer's name to see their visit history.
- You can check whether a customer has had multiple visits (i.e., not a new customer anymore).
- Use **Package Monitor** to check if a customer has active packages and remaining hours.

### Merging Accounts
- Sometimes customers have multiple accounts (different phone numbers or names).
- Flag this to David - he can merge accounts.

---

## 4. Pricing & Bay Rates

### Bay Rates (from database - products.products)

**Morning (before 2:00 PM):**
| Day | Rate |
|-----|------|
| Weekday | 500 THB/hour |
| Weekend | 700 THB/hour |

**Afternoon (2:00 PM - 6:00 PM):**
| Day | Rate |
|-----|------|
| Weekday | 700 THB/hour |
| Weekend | 900 THB/hour |

**Evening (6:00 PM onwards):**
| Day | Rate |
|-----|------|
| Weekday | 700 THB/hour |
| Weekend | 900 THB/hour |

### Buy 1 Get 1 Across Rate Periods
- If a B1G1 booking crosses different rate periods (e.g., 1pm-3pm on weekday), **the higher rate is charged**.
- Example: 1pm (500 THB) + 2pm (700 THB) = customer pays 700 THB for 2 hours.
- **Always explain this to the customer**: "If Buy 1 Get 1 crosses different bay rates, the higher rate is charged. Until 2PM our bay rate on weekdays is 500 Baht, afterwards it's 700 Baht."

### Coaching Rates (from database)

**1 PAX (single student):**
| Package | Total Price | Per Hour |
|---------|------------|----------|
| Single Lesson | 1,800 THB | 1,800 THB |
| 5 Lessons | 8,500 THB | 1,700 THB |
| 10 Lessons | 16,000 THB | 1,600 THB |
| 20 Lessons | 31,000 THB | 1,550 THB |
| 30 Lessons | 45,000 THB | 1,500 THB |
| 50 Lessons | 72,000 THB | 1,440 THB |

**2 PAX (two students together):**
| Package | Total Price | Per Hour |
|---------|------------|----------|
| Single Lesson | 2,400 THB | 2,400 THB |
| 5 Lessons | 11,000 THB | 2,200 THB |
| 10 Lessons | 20,500 THB | 2,050 THB |
| 20 Lessons | 39,000 THB | 1,950 THB |
| 30 Lessons | 57,000 THB | 1,900 THB |
| 50 Lessons | 92,500 THB | 1,850 THB |

**On Course:** 5,000 THB per lesson.
**Outside Coaching Fee:** 200 THB/hour floor fee (some coaches have legacy rate of 100 THB - check with David).
**Sim to Fairway Package (2 person):** 13,000 THB.

- Coaching includes equipment and simulator usage - **always highlight this** to make the price more attractive.
- Bay fee is INCLUDED in coaching price (customer pays one price).
- Coaching sessions default to Bay 4 (AI Bay).

### Payment Methods
- Cash, credit/debit cards, bank transfer, QR payment.
- Bank: **LENGOLF CO. LTD., Kasikorn Bank, Account: 1703270294**

---

## 5. Promotions & Packages

### Current Promotions (Check Staff Channel for Latest)
- Promotions change monthly. Always check the **staff channel** for current offers.
- Pinned messages in the staff channel have the latest promotion details.

### Buy 1 Get 1 Free
- Available to **new customers** automatically.
- Available to **old/returning customers** if we proactively call/contact them.
- Not available for ClassPass bookings.
- The free hour must be used within **7 days**.
- Customer needs to book 2 hours to use B1G1.

### Monthly Packages (from database)

**Hourly Packages:**
| Package | Hours | Validity | Price |
|---------|-------|----------|-------|
| Bronze | 5 hours | 1 month | 3,000 THB |
| Iron | 8 hours | 2 months | 4,500 THB |
| Silver | 15 hours | 3 months | 8,000 THB |
| Gold | 30 hours | 6 months | 14,000 THB |
| Early Bird | 10 hours | 6 months | 4,800 THB |

**Unlimited Packages:**
| Package | Validity | Price |
|---------|----------|-------|
| Early Bird+ | 1 month (until 2 PM only) | 5,000 THB |
| Diamond | 1 month | 8,000 THB |
| Diamond+ | 3 months | 18,000 THB |

**Starter Packages (Coaching + Sim):**
| Package | Hours | Validity | Price |
|---------|-------|----------|-------|
| Starter (Sim) | 5 hours | 6 months | Part of combo |
| Starter (Coaching, 1 PAX) | 5 hours | 6 months | 11,000 THB |
| Starter (Coaching, 2 PAX) | 5 hours | 6 months | 13,500 THB |

- Monthly packages may include **20% extra hours** as a promotion (this is extra hours, NOT a discount - important distinction). Check current promotions.
- Early Bird / Early Bird+ packages: only valid until 2:00 PM.
- Promotions change monthly - always check the **staff channel** for current active promos.

### Package Extensions
- Loyal customers: can extend by 1 month as exception.
- Long-expired packages: cannot just extend. Customer must buy a new package, and remaining hours from the old one can be transferred to the new package.
- Extension decisions should be discussed with David.

### Referral Program
- Existing customer refers a new customer to buy a **monthly package** (not coaching).
- The new customer (friend) gets **10% off**.
- The referrer gets a **free package** of the same type.
- They don't have to play together.
- Applies to: Bronze, Gold, Diamond, and all other monthly packages. NOT coaching packages.

### Starter Package
- For customers who want self-practice after coaching lessons, recommend the Starter package.

### Food & Play Sets (from database)
| Set | Price | Notes |
|-----|-------|-------|
| Set A | 1,200 THB | Bay + food for smaller groups |
| Set B | 2,100 THB | Bay + food for up to 5 people |
| Set C | 2,975 THB | Bay + food premium option |

### Drinks & Golf Bundles
| Bundle | Price |
|--------|-------|
| 2 Hours + Singha Bucket Beer (4) | 2,000 THB |
| Free Flow Beer | 499 THB |
| Unlimited Softdrink (per hour) | 100 THB |

### Event Packages (from database)
| Package | Price |
|---------|-------|
| Small (S) | 9,999 THB |
| Medium (M) | 21,999 THB |

---

## 6. Coaching

### Coaches (4 PGA-certified professionals)
| Coach | Full Name | Expertise | Status |
|-------|-----------|-----------|--------|
| **Pro Boss** | Parin Phokan | Drive training, course management, advanced shot shaping, junior golf | Limited - doesn't live in Bangkok, visits a few weeks at a time. Travels for tournaments. |
| **Pro Ratchavin** | Ratchavin Tanakasempipat | Beginners, short game, junior development. TrackMan L2, Swing Catalyst certified. | **RESTRICTED** - Do NOT share his availability to anyone except his current students. Not participating in free trials. |
| **Pro Min** | Varuth Kjonkittiskul | Beginner programs, course management, putting program | Active, free trial available. |
| **Pro Noon** | Nucharin | Ladies' golf, junior development, school programs (Concordian International) | Check current status. Availability varies seasonally. |

**All 4 coaches** are trained for junior development (age-appropriate instruction, same pricing as adults).

### Coaching Package Validity (from database)
| Package | Validity |
|---------|----------|
| 5 hours | 6 months |
| 10 hours | 1 year |
| 20 hours | 2 years |
| 30 hours | 2 years |
| 50 hours | 2 years |
| Starter | 6 months |

### Checking Availability
- Use the **Coaching Assist** page to check coach schedules.
- You can share a coach's profile and availability card with customers (select specific days).
- Only share profiles of coaches who are **currently available and accepting new students**.

### Free Trial
- Book as a normal coaching session.
- Add note: "free trial" in the booking notes.
- Available from all participating coaches (currently Min, Boss, Noon - NOT Ratchavin).
- Don't proactively offer free trial - only when customer asks.

### Booking Coaching Sessions
- **4-5 hours before the lesson**: Can book directly using the coaching assist schedule.
- **1-2 hours before**: Must reconfirm with the coach first (ask in their LINE channel).
- If no slots available with the requested coach, suggest a different coach who can do the requested time.
- Always ask coaches for additional slots if customers request specific times.
- For schedule changes: cancel the previous booking and create a new one.

### Communicating with Coaches
- Use the LINE group channels for each coach.
- You can write in Thai to Min/Ratchavin/Boss.
- If a coach doesn't reply, feel free to re-ping after some time.

---

## 7. Club Rentals

### Three Tiers of Clubs

**1. Standard (FREE):** Included with any bay booking. Right and left-handed available. **Indoor use only** - cannot be taken off-site to golf courses.

**2. Premium:** Higher quality sets for indoor or course use.
- Men's: Callaway Warbird (Uniflex)
- Women's: Majesty Shuttle 2023 (Ladies flex)

**3. Premium+:** Tour-level set, men's only.
- Callaway Paradym Forged Carbon with Ventus TR shafts

### Pricing (from database)
| Item | Indoor Rate | Course Rate |
|------|------------|-------------|
| Premium | 150 THB/session | 1,200 THB/day |
| Premium+ | 250 THB/session | 1,800 THB/day |
| Delivery (Bangkok) | - | 500 THB (2-way) |

### Physical Inventory (current stock)
| Set | Quantity |
|-----|----------|
| Premium Men | 2 sets |
| Premium Women | 1 set |
| Premium+ Men | 1 set |
| Left Handed | 1 set |

**Multi-day value:** "Pay 2 get 1 free" - proactively mention when customer asks about 2+ days.

### Delivery Fees
- **Standard delivery** (up to 2 bags): 500 THB (covers both delivery and pickup).
- **3+ bags**: 750 THB (need larger vehicle).
- **Customer picks up/returns at shop**: No delivery fee.

### Rental Process - Requirements
1. Phone number + Name
2. **Full pre-payment** (cannot collect payment on delivery - we use third-party delivery)
3. Copy of passport/ID
4. Delivery time + location
5. Pickup time + location

### Payment Methods
- QR code scan
- Bank transfer: **LENGOLF CO. LTD., Kasikorn Bank, Account: 1703270294**
- Cash (only if customer comes to shop)
- After payment received, ask staff to make a receipt and mark as paid in the system.

### Golf Course Delivery
- Call the golf course to inform them about the delivery.
- Provide: tee time, booking name, number of bags, estimated arrival time.
- Confirm if the course can hold bags and assist with pickup after the round.
- For hotel deliveries: ask for room number so bags can be left with concierge.

### Critical Rules
- **Never rent out clubs that are already reserved** for another customer.
- Always check current availability before confirming.
- Don't send full rental details/confirmation until payment is clarified.

---

## 8. Events & Parties

### Small Parties (Up to ~12 people)
- Can use standard **Set B** package: includes bay + food for 5 people, 2 hours.
- For more than 5 people with Set B: extra food is a la carte.
- Groups can also just book bays normally at hourly rates without a party package (no extra fees).

### Custom Event Pricing Examples (for reference)
**2 Bays, 3 Hours:**
| Option | Price |
|--------|-------|
| Without food | 3,600 THB (regular 4,200) |
| 20 Beers + Unlimited Soft Drinks | Ask David |
| Free-flow Beer + Soft Drinks | Ask David |

**Unlimited soft drinks**: 150 THB per person for 3 hours.

### Large Events (20+ people)
- Custom package required - Dolly or David handles pricing.
- Share our event page: **https://www.len.golf/events/**
- Ask for their phone number so we can call to discuss details.
- **Minimum 3 hours for large events.**
- No deposit typically required for smaller parties.

### Event Inquiry Process
1. Share event page link + standard package as reference.
2. Ask for phone number and preferred date/time.
3. Ask for number of guests.
4. **We call them back** - never ask the customer to call us.
5. Hand off to Dolly/David for custom quotations.
6. Standard quotations can be shared as PDF.

### Decorations
- Balloon decorations allowed - ceiling height is over 3m.
- Can take photos of the venue/putting area for customers planning decorations.

---

## 9. Communication Guidelines

### Response Time
- Aim to reply within **15 minutes** during working hours.
- If you'll be unavailable for more than 30 minutes, inform the **LENGOLF Chat group**.
- Share your unavailability schedule in advance when possible.

### Tone & Style
- Use customer's **first name** for personal touch.
- Be polite, professional, and friendly.
- Use the word **"policy"** when explaining rules - never say "owner" or "the owner said."
- When explaining pricing that might seem high, always **highlight what's included** (e.g., coaching includes equipment + sim usage).
- Don't just send the price - explain how it works and the value.

### Template Answers
- There are template answers available in the unified chat for common questions.
- Use these for standard responses (pricing, promotions, etc.).
- Always check the image/template library before typing a custom response.

### Language Support
- Respond in the customer's preferred language.
- For Chinese customers: use the translate feature; you can reply in Chinese too.
- For Thai customers: use natural Thai.
- For English: standard professional English.

### Social Media Comments
- Reply to legitimate questions on IG/FB comments.
- Ignore obvious spam.
- If they ask to DM, then message privately.
- Some comments can be replied to publicly, some privately - use judgment.

### Following Up
- Give customers updates even if you don't have an answer yet - don't leave them hanging.
- After 7 days of no response from a customer, mark the lead as **"Lost/No Response."**
- For cold/stale chats, reach out periodically to ask if they're still interested.

---

## 10. Administrative Tasks

### Time Clock
- Clock in when you start your shift.
- Clock out when you leave (including for breaks - clock out for break, clock in after).
- If you forget to clock in/out, inform David with the approximate times.

### Lead Management
- Update contacted leads and their outcomes regularly.
- Mark as "Lost" after 7 days of no response.
- Follow up on open/warm leads periodically.

### Bay Issues
- If a bay has technical issues (e.g., auto-tee not working), **check with David before assuming the bay is unusable or blocking it**.
- A bay with a broken auto-tee is still functional for play - only the auto tee doesn't work.
- Don't tell customers a bay is "broken" or "unavailable" without confirming. You can say "one bay currently has auto-tee maintenance" and still offer it.
- If a bay genuinely needs to be blocked, create a blocking booking for the affected period.
- When in doubt about bay status, ask David or on-site staff before turning away customers.

### Package Management
- Check Package Monitor for customer package status.
- If a customer says their package hours are wrong, verify in the system before making changes.
- Package extensions and hour transfers require David's approval.

### Tax Invoices
- Standard tax invoices are issued via FlowAccount.
- If a customer needs a specific description on their invoice, they can request it.
- We can adjust the description but may need to issue a separate invoice.

### Payment Collection
- For pre-payments: send QR code or bank transfer details.
- Always get payment slip/confirmation before marking as paid.
- For on-site purchases: staff makes the receipt.

---

## 11. Common Scenarios & How to Handle Them

### "Can I extend my package?"
1. Check how long until expiry in Package Monitor.
2. If still has time remaining but can't use it: can extend by 1 month (David approves).
3. If long-expired: must buy new package; can transfer remaining hours from old package.
4. For loyal customers: more flexibility with extensions.

### "Can someone else use my free hour / package?"
- **Free hour**: Only if they come together.
- **Package**: Generally no, unless there's a special circumstance (e.g., traveling, can't use it). Discuss with David.

### Customer wants discount on coaching
- Explain that the 10-hour package is already ~15% discount vs single lesson rate (2,400 -> 2,050/hr).
- Highlight that coaching includes equipment and simulator usage.

### Customer calling from international number
- Recommend contacting via WhatsApp or LINE instead.

### Customer reports website/booking error
- Ask for a screenshot.
- Test the issue yourself if possible.
- Escalate to David with the screenshot and error details.

### Customer wants to bring their own coach
- Bay rate + 200 THB/hour floor fee.
- Ask the coach to send their bio/credentials.

### Wrong shop / confused customer
- Confirm how they made their "booking" - they may have contacted a different golf venue.
- Politely clarify.

### Spam / sales messages
- Ignore or redirect: "Please send your details to info@len.golf"
- Can move to spam in the system.

### Customer asks about food/menu
- Share the drink/food menu from the image library.
- For specific questions about items, check with Net or the on-duty staff.

---

## 12. Important Rules & Pitfalls

### Must-Do
- **Always link customers** to their chat profile.
- **Always send cancellation notifications** through the system.
- **Always check availability** before confirming bookings.
- **Always verify club rental reservations** before renting out sets.
- **Always reply from Unified Chat** (not LINE OA directly or IG directly).
- **Always call customers back** - never ask them to call us.
- **Always double-check AI suggestions** before sending.
- **Always inform the team** when you'll be unavailable for an extended period.

### Never Do
- Never mention specific **bay numbers** to customers.
- Never share **Ratchavin's availability** (except to his current students).
- Never share coach profiles unless they are **currently available**.
- Never send full club rental details until **payment is clarified**.
- Never say "the owner" - use "our policy" instead.
- Never rent out clubs that are **already reserved**.
- Never ask customers to call us - **we call back**.
- Never commit to pricing for large events without checking with David/Dolly.
- Never reply to IG/FB from Business Suite - use Unified Chat.

### Common Mistakes to Avoid
- Forgetting to create customer before making a booking.
- Sending booking confirmation manually (it's automatic now).
- Not checking if a customer already exists before creating a duplicate.
- Not explaining B1G1 rate rules when booking crosses rate periods.
- Assuming a bay is completely unusable when only the auto-tee is down (the simulator still works).
- Confusing "20% extra hours" with "20% discount" - they are extra hours, not a price discount.
- Replying to IG/FB messages from Meta Business Suite instead of Unified Chat (breaks tracking).
- Telling a customer to call us instead of offering to call them back.
- Sharing a coach's availability without first checking Coaching Assist for current schedule.
- Sending AI-suggested replies without reading and verifying them first.

---

## Key Contacts & Escalation

| Who | When to Escalate |
|-----|-----------------|
| **David** | Custom pricing, package exceptions, technical issues, club rental coordination, complex situations |
| **Dolly** | Event calls, on-site operations, calling customers back |
| **Net** | Food/menu questions, on-site operational questions |
| **May** | On-site operations, shift coverage |

### Bank Details (for customer payments)
```
LENGOLF CO. LTD.
Kasikorn Bank
Account: 1703270294
```

### Important Links
- Customer self-booking: https://booking.len.golf/
- Events page: https://www.len.golf/events/
- Unified Chat: https://lengolf-forms.vercel.app/staff/unified-chat
- General email: info@len.golf

---

*Last updated: March 2026*
*Based on operational experience from December 2025 - March 2026*
