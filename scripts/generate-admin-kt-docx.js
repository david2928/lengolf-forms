/**
 * Generate LENGOLF Admin Knowledge Transfer Guide as .docx
 * Run: node scripts/generate-admin-kt-docx.js
 * Output: docs/operations/LENGOLF-Admin-Knowledge-Transfer.docx
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, ShadingType,
  Header, Footer, PageNumber, convertInchesToTwip,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── Styling helpers ───────────────────────────────────────────────────────

const BRAND_GREEN = "005a32";
const BRAND_GOLD = "c8a96e";
const DARK = "333333";
const LIGHT_BG = "F6FFFA";
const WHITE = "FFFFFF";
const GRAY = "999999";

const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };

function headerCell(text, width) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: "center",
    shading: { fill: BRAND_GREEN, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, bold: true, color: WHITE, size: 20, font: "Calibri" })]
    })]
  });
}

function dataCell(text, { alt = false, bold = false, width } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: "center",
    shading: alt ? { fill: "F2F2F2", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
    children: [new Paragraph({
      spacing: { before: 30, after: 30 },
      children: [new TextRun({ text, bold, color: DARK, size: 19, font: "Calibri" })]
    })]
  });
}

function makeTable(headers, rows, colWidths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((h, i) => headerCell(h, colWidths ? colWidths[i] : undefined))
      }),
      ...rows.map((row, ri) => new TableRow({
        cantSplit: true,
        children: row.map((cell, ci) => dataCell(cell, { alt: ri % 2 === 1, width: colWidths ? colWidths[ci] : undefined }))
      }))
    ]
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 30, font: "Calibri", color: BRAND_GREEN })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Calibri", color: BRAND_GREEN })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    keepNext: true,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: "Calibri", color: "2E75B6" })]
  });
}

function para(text, { bold = false, italic = false, spacing } = {}) {
  return new Paragraph({
    spacing: spacing || { after: 100, line: 276 },
    children: [new TextRun({ text, bold, italic, size: 20, font: "Calibri", color: DARK })]
  });
}

function bulletPoint(text, { bold = false } = {}) {
  return new Paragraph({
    spacing: { after: 60, line: 276 },
    indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: "\u2022  ", size: 20, font: "Calibri", color: BRAND_GREEN }),
      new TextRun({ text, bold, size: 20, font: "Calibri", color: DARK })
    ]
  });
}

function boldLabel(label, value) {
  return new Paragraph({
    spacing: { after: 60, line: 276 },
    indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: "\u2022  ", size: 20, font: "Calibri", color: BRAND_GREEN }),
      new TextRun({ text: label, bold: true, size: 20, font: "Calibri", color: DARK }),
      new TextRun({ text: value, size: 20, font: "Calibri", color: DARK })
    ]
  });
}

function hr() {
  return new Paragraph({
    spacing: { before: 100, after: 200 },
    border: { bottom: { color: "BFBFBF", space: 1, style: BorderStyle.SINGLE, size: 6 } }
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 80 } });
}

// ─── Build the document ────────────────────────────────────────────────────

const doc = new Document({
  creator: "LENGOLF",
  title: "LENGOLF Admin Knowledge Transfer Guide",
  styles: {
    default: {
      document: {
        run: { size: 20, font: "Calibri", color: DARK },
        paragraph: { spacing: { after: 100, line: 276 } }
      }
    }
  },
  sections: [{
    properties: {
      titlePage: true,
      page: {
        size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
        margin: {
          top: convertInchesToTwip(0.8),
          bottom: convertInchesToTwip(0.7),
          left: convertInchesToTwip(0.9),
          right: convertInchesToTwip(0.9),
          header: convertInchesToTwip(0.4),
          footer: convertInchesToTwip(0.3),
        }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "LENGOLF  |  Admin Knowledge Transfer", size: 16, color: GRAY, italics: true, font: "Calibri" })]
        })]
      }),
      first: new Header({
        children: [new Paragraph({ children: [] })]
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 16, color: GRAY, font: "Calibri" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: "Calibri" }),
            new TextRun({ text: " of ", size: 16, color: GRAY, font: "Calibri" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GRAY, font: "Calibri" }),
          ]
        })]
      }),
    },
    children: [
      // ═══ TITLE PAGE ═══
      emptyLine(), emptyLine(), emptyLine(), emptyLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "LENGOLF", bold: true, size: 56, font: "Calibri", color: BRAND_GREEN })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Admin Knowledge Transfer Guide", size: 36, font: "Calibri", color: DARK })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        border: { bottom: { color: BRAND_GOLD, space: 1, style: BorderStyle.SINGLE, size: 12 } },
        children: []
      }),
      emptyLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "Compiled from operational experience (Dec 2025 - Mar 2026),", size: 20, font: "Calibri", color: GRAY, italic: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "AI knowledge base, and live database records.", size: 20, font: "Calibri", color: GRAY, italic: true })]
      }),
      emptyLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "March 2026", size: 22, font: "Calibri", color: DARK, bold: true })]
      }),

      // ═══ ABOUT LENGOLF ═══
      new Paragraph({ pageBreakBefore: true }),
      heading1("About LENGOLF"),
      para("LENGOLF is a premium indoor golf simulator and bar in Bangkok, Thailand.", { bold: true }),
      boldLabel("Location: ", "The Mercury Ville @ BTS Chidlom (Exit 4), Floor 4, 540 Ploenchit Road, Bangkok 10330"),
      boldLabel("Hours: ", "9:00 AM to 11:00 PM daily (from April 1, 2026). Last booking 10:00 PM. Peak: 6-9 PM."),
      boldLabel("Phone: ", "096-668-2335"),
      boldLabel("Email: ", "info@len.golf"),
      boldLabel("LINE: ", "@lengolf"),
      boldLabel("Website: ", "https://len.golf"),
      boldLabel("Self-Booking: ", "https://booking.len.golf"),
      emptyLine(),
      heading2("Facility"),
      bulletPoint("4 simulator bays with Korean Bravo Golf simulators (99% accuracy swing tracking)"),
      bulletPoint("Bays 1-3: Social Bays (up to 5 players each)"),
      bulletPoint("Bay 4: AI Bay / Uneekor (1-2 players, advanced analytics, dual camera)"),
      bulletPoint("All bays have club speed tracking with video and auto tee system"),
      bulletPoint("100+ championship courses (Pebble Beach, TPC Sawgrass, etc.)"),
      bulletPoint("Large putting green with realistic slopes"),
      bulletPoint("Full bar with food and beverages, food service to bays"),
      bulletPoint("50+ person event space capacity"),
      bulletPoint("3 hours free parking with LENGOLF receipt", { bold: true }),
      bulletPoint("What to bring: Nothing - we provide everything (free standard clubs with every booking)"),

      // ═══ 1. TOOLS & ACCESS ═══
      hr(),
      heading1("1. Tools & Access"),
      heading2("Primary Tools"),
      makeTable(
        ["Tool", "Purpose", "URL / Access"],
        [
          ["Unified Chat", "LINE + IG/FB messaging", "lengolf-forms.vercel.app/staff/unified-chat"],
          ["Meta Business Suite", "WhatsApp messages ONLY", "Mobile app (Meta)"],
          ["Booking Calendar", "View/edit/cancel bookings", "Via unified chat or admin panel"],
          ["Coaching Assist", "Check coach availability", "lengolf-forms.vercel.app/coaching-assist"],
          ["Package Monitor", "Check customer packages", "lengolf-forms.vercel.app/package-monitor"],
          ["LINE OA Manager", "Official LINE account", "Via LINE Business invite"],
        ],
        [25, 35, 40]
      ),
      emptyLine(),
      heading2("Channel Routing (CRITICAL)"),
      makeTable(
        ["Channel", "Where to Reply", "Notes"],
        [
          ["LINE", "Unified Chat", "Never reply from LINE OA directly"],
          ["Facebook Messenger", "Unified Chat", "Never reply from Meta Business Suite"],
          ["Instagram DMs", "Unified Chat", "Never reply from Instagram app directly"],
          ["WhatsApp", "Meta Business Suite app", "Only channel NOT in Unified Chat"],
        ],
        [25, 35, 40]
      ),
      emptyLine(),
      para("Why this matters: If you reply from the wrong tool, the response won't be tracked. Other staff can't see what was said, and the AI assistant won't have context.", { bold: true }),
      emptyLine(),
      heading2("AI Suggestion Feature"),
      bulletPoint("AI assistant built into the chat suggests replies - click the icon on the right side"),
      bulletPoint("ALWAYS double-check AI suggestions before sending - it can make mistakes", { bold: true }),
      bulletPoint("Can help with creating bookings and customers"),
      bulletPoint("If a suggested reply looks odd (especially Thai), edit before sending"),

      // ═══ 2. BOOKING OPERATIONS ═══
      hr(),
      heading1("2. Booking Operations"),
      heading2("Creating a Booking"),
      bulletPoint("Customer must exist first - create them before booking if new", { bold: true }),
      bulletPoint("To create customer: click their profile in chat, use create customer option"),
      bulletPoint("Required for new customer: Phone number + Name"),
      bulletPoint("Select booking date, time, duration, and bay"),
      bulletPoint("Add special notes (e.g., \"B1G1\", \"left handed\", \"premium clubs\", \"free trial\")"),
      bulletPoint("Booking confirmation is sent automatically - no need to send manually", { bold: true }),
      emptyLine(),
      heading2("Bay Assignment"),
      bulletPoint("Social Bays (1-3): Standard, default for most bookings"),
      bulletPoint("AI Bay (Bay 4 / Uneekor): Premium, more metrics and dual camera"),
      bulletPoint("Don't ask customers which bay unless they specifically request one"),
      bulletPoint("NEVER mention bay numbers to customers", { bold: true }),
      emptyLine(),
      heading2("Editing & Cancelling"),
      bulletPoint("To edit: click customer name in calendar, then edit"),
      bulletPoint("Major time changes: cancel old booking and create new one"),
      bulletPoint("Always send cancellation notifications through the system (click cancel - auto notifies)"),
      emptyLine(),
      heading2("Self-Service Booking"),
      bulletPoint("Customers can self-book at: booking.len.golf (instant confirmation)"),
      bulletPoint("Recommend to customers who want to browse availability themselves"),

      // ═══ 3. CUSTOMER MANAGEMENT ═══
      hr(),
      heading1("3. Customer Management"),
      heading2("Linking Customers"),
      bulletPoint("Always try to link customers to their LINE/IG profile"),
      bulletPoint("If phone starts with 0, try removing the leading 0 when searching"),
      bulletPoint("Search by phone number if name doesn't match"),
      emptyLine(),
      heading2("Checking History"),
      bulletPoint("Click customer name to see visit history"),
      bulletPoint("Use Package Monitor to check active packages and remaining hours"),
      emptyLine(),
      heading2("Merging Accounts"),
      bulletPoint("Flag duplicate accounts to David - he can merge them"),

      // ═══ 4. PRICING & BAY RATES ═══
      hr(),
      heading1("4. Pricing & Bay Rates"),
      heading2("Bay Rates"),
      heading3("Morning (before 2:00 PM)"),
      makeTable(["Day", "Rate"], [["Weekday", "500 THB/hour"], ["Weekend", "700 THB/hour"]], [50, 50]),
      emptyLine(),
      heading3("Afternoon (2:00 PM - 6:00 PM)"),
      makeTable(["Day", "Rate"], [["Weekday", "700 THB/hour"], ["Weekend", "900 THB/hour"]], [50, 50]),
      emptyLine(),
      heading3("Evening (6:00 PM onwards)"),
      makeTable(["Day", "Rate"], [["Weekday", "700 THB/hour"], ["Weekend", "900 THB/hour"]], [50, 50]),
      emptyLine(),
      heading2("Buy 1 Get 1 Across Rate Periods"),
      bulletPoint("If B1G1 crosses different rate periods, the HIGHER rate is charged", { bold: true }),
      bulletPoint("Example: 1pm (500) + 2pm (700) = customer pays 700 THB for 2 hours"),
      bulletPoint("Always explain: \"Until 2PM weekday rate is 500, afterwards 700. B1G1 charges the higher rate.\""),
      emptyLine(),
      heading2("Coaching Rates - 1 PAX"),
      makeTable(
        ["Package", "Total Price", "Per Hour"],
        [
          ["Single Lesson", "1,800 THB", "1,800 THB"],
          ["5 Lessons", "8,500 THB", "1,700 THB"],
          ["10 Lessons", "16,000 THB", "1,600 THB"],
          ["20 Lessons", "31,000 THB", "1,550 THB"],
          ["30 Lessons", "45,000 THB", "1,500 THB"],
          ["50 Lessons", "72,000 THB", "1,440 THB"],
        ],
        [40, 30, 30]
      ),
      emptyLine(),
      heading2("Coaching Rates - 2 PAX"),
      makeTable(
        ["Package", "Total Price", "Per Hour"],
        [
          ["Single Lesson", "2,400 THB", "2,400 THB"],
          ["5 Lessons", "11,000 THB", "2,200 THB"],
          ["10 Lessons", "20,500 THB", "2,050 THB"],
          ["20 Lessons", "39,000 THB", "1,950 THB"],
          ["30 Lessons", "57,000 THB", "1,900 THB"],
          ["50 Lessons", "92,500 THB", "1,850 THB"],
        ],
        [40, 30, 30]
      ),
      emptyLine(),
      bulletPoint("On Course: 5,000 THB per lesson"),
      bulletPoint("Outside Coaching Fee: 200 THB/hour floor fee"),
      bulletPoint("Sim to Fairway Package (2 person): 13,000 THB"),
      bulletPoint("Coaching INCLUDES equipment and simulator usage - always highlight this!", { bold: true }),
      bulletPoint("Bay fee is included in coaching price (customer pays one price)"),
      bulletPoint("Coaching sessions default to Bay 4 (AI Bay)"),
      emptyLine(),
      heading2("Payment Methods"),
      bulletPoint("Cash, credit/debit cards, bank transfer, QR payment"),
      boldLabel("Bank: ", "LENGOLF CO. LTD., Kasikorn Bank, Account: 1703270294"),

      // ═══ 5. PROMOTIONS & PACKAGES ═══
      hr(),
      heading1("5. Promotions & Packages"),
      para("Promotions change monthly. Always check the staff channel for current offers.", { bold: true }),
      emptyLine(),
      heading2("Buy 1 Get 1 Free"),
      bulletPoint("Available to NEW customers automatically"),
      bulletPoint("Available to old/returning customers if we proactively call/contact them"),
      bulletPoint("NOT available for ClassPass bookings"),
      bulletPoint("Free hour must be used within 7 days", { bold: true }),
      bulletPoint("Customer needs to book 2 hours to use B1G1"),
      emptyLine(),
      heading2("Monthly Packages - Hourly"),
      makeTable(
        ["Package", "Hours", "Validity", "Price"],
        [
          ["Bronze", "5 hours", "1 month", "3,000 THB"],
          ["Iron", "8 hours", "2 months", "4,500 THB"],
          ["Silver", "15 hours", "3 months", "8,000 THB"],
          ["Gold", "30 hours", "6 months", "14,000 THB"],
          ["Early Bird", "10 hours", "6 months", "4,800 THB"],
        ],
        [25, 25, 25, 25]
      ),
      emptyLine(),
      heading2("Monthly Packages - Unlimited"),
      makeTable(
        ["Package", "Validity", "Price"],
        [
          ["Early Bird+", "1 month (until 2 PM only)", "5,000 THB"],
          ["Diamond", "1 month", "8,000 THB"],
          ["Diamond+", "3 months", "18,000 THB"],
        ],
        [30, 40, 30]
      ),
      emptyLine(),
      heading2("Starter Packages (Coaching + Sim)"),
      makeTable(
        ["Package", "Hours", "Validity", "Price"],
        [
          ["Starter (Coaching, 1 PAX)", "5 hours", "6 months", "11,000 THB"],
          ["Starter (Coaching, 2 PAX)", "5 hours", "6 months", "13,500 THB"],
        ],
        [35, 20, 20, 25]
      ),
      emptyLine(),
      bulletPoint("\"20% extra hours\" = extra hours, NOT a discount - important distinction", { bold: true }),
      bulletPoint("Early Bird / Early Bird+ packages: only valid until 2:00 PM"),
      emptyLine(),
      heading2("Package Extensions"),
      bulletPoint("Loyal customers: can extend by 1 month as exception"),
      bulletPoint("Long-expired: must buy new package; can transfer remaining hours"),
      bulletPoint("Extension decisions require David's approval"),
      emptyLine(),
      heading2("Referral Program"),
      bulletPoint("Existing customer refers new customer to buy a monthly package (not coaching)"),
      bulletPoint("New customer gets 10% off"),
      bulletPoint("Referrer gets a free package of the same type"),
      bulletPoint("They don't have to play together"),
      emptyLine(),
      heading2("Food & Play Sets"),
      makeTable(
        ["Set", "Price", "Notes"],
        [
          ["Set A", "1,200 THB", "Bay + food for smaller groups"],
          ["Set B", "2,100 THB", "Bay + food for up to 5 people"],
          ["Set C", "2,975 THB", "Bay + food premium option"],
        ],
        [20, 25, 55]
      ),
      emptyLine(),
      heading2("Drinks & Golf Bundles"),
      makeTable(
        ["Bundle", "Price"],
        [
          ["2 Hours + Singha Bucket Beer (4)", "2,000 THB"],
          ["Free Flow Beer", "499 THB"],
          ["Unlimited Softdrink (per hour)", "100 THB"],
        ],
        [60, 40]
      ),
      emptyLine(),
      heading2("Event Packages"),
      makeTable(
        ["Package", "Price"],
        [["Small (S)", "9,999 THB"], ["Medium (M)", "21,999 THB"]],
        [50, 50]
      ),

      // ═══ 6. COACHING ═══
      hr(),
      heading1("6. Coaching"),
      heading2("Coaches (4 PGA-certified professionals)"),
      makeTable(
        ["Coach", "Full Name", "Expertise", "Status"],
        [
          ["Pro Boss", "Parin Phokan", "Drive training, course management, shot shaping, junior", "Limited - visits BKK a few weeks at a time"],
          ["Pro Ratchavin", "Ratchavin T.", "Beginners, short game, junior. TrackMan L2.", "RESTRICTED - current students only"],
          ["Pro Min", "Varuth K.", "Beginner programs, course mgmt, putting", "Active, free trial available"],
          ["Pro Noon", "Nucharin", "Ladies' golf, junior, school programs", "Check current status"],
        ],
        [15, 18, 37, 30]
      ),
      emptyLine(),
      para("All 4 coaches are trained for junior development (age-appropriate instruction, same pricing as adults).", { bold: true }),
      emptyLine(),
      heading2("Coaching Package Validity"),
      makeTable(
        ["Package", "Validity"],
        [
          ["5 hours", "6 months"],
          ["10 hours", "1 year"],
          ["20 hours", "2 years"],
          ["30 hours", "2 years"],
          ["50 hours", "2 years"],
          ["Starter", "6 months"],
        ],
        [50, 50]
      ),
      emptyLine(),
      heading2("Checking Availability"),
      bulletPoint("Use Coaching Assist page to check schedules"),
      bulletPoint("Share coach profile + availability card (select specific days)"),
      bulletPoint("Only share profiles of coaches who are currently available"),
      emptyLine(),
      heading2("Free Trial"),
      bulletPoint("Book as normal session, add note \"free trial\""),
      bulletPoint("Available: Min, Boss, Noon. NOT Ratchavin."),
      bulletPoint("Don't proactively offer - only when customer asks", { bold: true }),
      emptyLine(),
      heading2("Booking Coaching Sessions"),
      bulletPoint("4-5 hours before: book directly from coaching assist"),
      bulletPoint("1-2 hours before: must reconfirm with coach first (LINE channel)"),
      bulletPoint("No slots? Suggest a different coach for the requested time"),
      bulletPoint("Schedule changes: cancel previous booking and create new one"),
      emptyLine(),
      heading2("Communicating with Coaches"),
      bulletPoint("Use LINE group channels for each coach"),
      bulletPoint("Can write in Thai to Min/Ratchavin/Boss"),
      bulletPoint("If no reply, re-ping after some time"),

      // ═══ 7. CLUB RENTALS ═══
      hr(),
      heading1("7. Club Rentals"),
      heading2("Three Tiers"),
      bulletPoint("Standard (FREE): Included with any bay booking. Indoor use only."),
      bulletPoint("Premium: Men's Callaway Warbird / Women's Majesty Shuttle 2023"),
      bulletPoint("Premium+: Callaway Paradym Forged Carbon, Ventus TR shafts (men's only)"),
      emptyLine(),
      heading2("Pricing"),
      makeTable(
        ["Item", "Indoor Rate", "Course Rate"],
        [
          ["Premium", "150 THB/session", "1,200 THB/day"],
          ["Premium+", "250 THB/session", "1,800 THB/day"],
          ["Delivery (Bangkok)", "-", "500 THB (2-way)"],
        ],
        [35, 30, 35]
      ),
      emptyLine(),
      heading2("Physical Inventory"),
      makeTable(
        ["Set", "Quantity"],
        [
          ["Premium Men", "2 sets"],
          ["Premium Women", "1 set"],
          ["Premium+ Men", "1 set"],
          ["Left Handed", "1 set"],
        ],
        [60, 40]
      ),
      emptyLine(),
      bulletPoint("Multi-day value: \"Pay 2 get 1 free\" - mention when customer asks about 2+ days"),
      emptyLine(),
      heading2("Delivery Fees"),
      bulletPoint("Up to 2 bags: 500 THB (covers delivery AND pickup)"),
      bulletPoint("3+ bags: 750 THB (larger vehicle needed)"),
      bulletPoint("Customer picks up/returns at shop: no fee"),
      emptyLine(),
      heading2("Rental Process - Requirements"),
      bulletPoint("Phone number + Name"),
      bulletPoint("Full pre-payment (cannot collect on delivery - third-party delivery)", { bold: true }),
      bulletPoint("Copy of passport/ID (always required for course rentals)"),
      bulletPoint("Delivery time + location"),
      bulletPoint("Pickup time + location"),
      emptyLine(),
      heading2("Golf Course Delivery"),
      bulletPoint("Call the golf course to inform about delivery"),
      bulletPoint("Provide: tee time, booking name, number of bags, arrival estimate"),
      bulletPoint("For hotels: ask for room number for concierge drop-off"),
      emptyLine(),
      heading2("Critical Rules"),
      bulletPoint("NEVER rent out clubs already reserved for another customer", { bold: true }),
      bulletPoint("Always check availability before confirming"),
      bulletPoint("Don't send full details until payment is clarified"),

      // ═══ 8. EVENTS & PARTIES ═══
      hr(),
      heading1("8. Events & Parties"),
      heading2("Small Parties (up to ~12 people)"),
      bulletPoint("Standard Set B: bay + food for 5 people, 2 hours"),
      bulletPoint("More than 5: extra food a la carte"),
      bulletPoint("Groups can also just book bays at hourly rate (no extra fees)"),
      emptyLine(),
      heading2("Large Events (20+ people)"),
      bulletPoint("Custom package - Dolly or David handles pricing"),
      bulletPoint("Share event page: https://www.len.golf/events/"),
      bulletPoint("Ask for phone number - WE call them back"),
      bulletPoint("Minimum 3 hours for large events"),
      bulletPoint("No deposit typically required for smaller parties"),
      emptyLine(),
      heading2("Event Inquiry Process"),
      bulletPoint("1. Share event page link + standard package as reference"),
      bulletPoint("2. Ask for phone number and preferred date/time"),
      bulletPoint("3. Ask for number of guests"),
      bulletPoint("4. WE call them back - never ask customer to call us", { bold: true }),
      bulletPoint("5. Hand off to Dolly/David for custom quotations"),
      emptyLine(),
      heading2("Decorations"),
      bulletPoint("Balloon decorations allowed - ceiling over 3m"),
      bulletPoint("Can take photos of venue/putting area for planning"),

      // ═══ 9. COMMUNICATION GUIDELINES ═══
      hr(),
      heading1("9. Communication Guidelines"),
      heading2("Response Time"),
      bulletPoint("Reply within 15 minutes during working hours", { bold: true }),
      bulletPoint("If unavailable 30+ min, inform LENGOLF Chat group"),
      bulletPoint("Share unavailability schedule in advance"),
      emptyLine(),
      heading2("Tone & Style"),
      bulletPoint("Use customer's first name for personal touch"),
      bulletPoint("Be polite, professional, and friendly"),
      bulletPoint("Use \"policy\" when explaining rules - never say \"owner\"", { bold: true }),
      bulletPoint("Highlight what's included when explaining pricing"),
      bulletPoint("Don't just send price - explain value"),
      emptyLine(),
      heading2("Template Answers"),
      bulletPoint("Templates available in unified chat for common questions"),
      bulletPoint("Always check image/template library first"),
      emptyLine(),
      heading2("Language Support"),
      bulletPoint("Respond in customer's preferred language"),
      bulletPoint("Chinese customers: use translate feature, can reply in Chinese"),
      bulletPoint("Thai: natural Thai. English: standard professional."),
      emptyLine(),
      heading2("Social Media Comments"),
      bulletPoint("Reply to legitimate questions on IG/FB"),
      bulletPoint("Ignore obvious spam"),
      bulletPoint("If they ask to DM, message privately"),
      emptyLine(),
      heading2("Following Up"),
      bulletPoint("Give updates even without an answer - don't leave customers hanging"),
      bulletPoint("7 days no response = mark as \"Lost/No Response\""),
      bulletPoint("Follow up on cold/stale chats periodically"),

      // ═══ 10. ADMINISTRATIVE TASKS ═══
      hr(),
      heading1("10. Administrative Tasks"),
      heading2("Time Clock"),
      bulletPoint("Clock in at start of shift, clock out when leaving"),
      bulletPoint("Clock out for breaks, clock in after"),
      bulletPoint("Forgot? Inform David with approximate times"),
      emptyLine(),
      heading2("Lead Management"),
      bulletPoint("Update lead outcomes regularly"),
      bulletPoint("Mark \"Lost\" after 7 days no response"),
      emptyLine(),
      heading2("Bay Issues"),
      bulletPoint("Check with David before assuming a bay is unusable", { bold: true }),
      bulletPoint("Broken auto-tee = bay still works for play"),
      bulletPoint("Don't say bay is \"broken\" without confirming"),
      bulletPoint("When in doubt, ask David or on-site staff before turning away customers"),
      emptyLine(),
      heading2("Package Management"),
      bulletPoint("Check Package Monitor for status"),
      bulletPoint("Verify in system before making changes"),
      bulletPoint("Extensions and transfers require David's approval"),
      emptyLine(),
      heading2("Tax Invoices"),
      bulletPoint("Standard invoices via FlowAccount"),
      bulletPoint("Customer can request custom description"),
      emptyLine(),
      heading2("Payment Collection"),
      bulletPoint("Pre-payments: send QR or bank transfer details"),
      bulletPoint("Always get payment slip before marking as paid"),

      // ═══ 11. COMMON SCENARIOS ═══
      hr(),
      heading1("11. Common Scenarios"),
      heading3("\"Can I extend my package?\""),
      bulletPoint("Check expiry in Package Monitor"),
      bulletPoint("Still active but can't use: extend 1 month (David approves)"),
      bulletPoint("Long-expired: must buy new, can transfer old hours"),
      emptyLine(),
      heading3("\"Can someone else use my free hour?\""),
      bulletPoint("Only if they come together"),
      bulletPoint("Packages: generally no, discuss with David"),
      emptyLine(),
      heading3("Customer wants coaching discount"),
      bulletPoint("10-hour package already ~15% off vs single lesson"),
      bulletPoint("Highlight: coaching includes equipment + sim usage"),
      emptyLine(),
      heading3("International number calling"),
      bulletPoint("Recommend WhatsApp or LINE instead"),
      emptyLine(),
      heading3("Website/booking error"),
      bulletPoint("Ask for screenshot, test yourself, escalate to David"),
      emptyLine(),
      heading3("Outside coach wants to teach"),
      bulletPoint("Bay rate + 200 THB/hour floor fee"),
      bulletPoint("Ask for coach's bio/credentials"),
      emptyLine(),
      heading3("Spam / sales messages"),
      bulletPoint("Ignore or redirect to info@len.golf"),
      bulletPoint("Move to spam in system"),

      // ═══ 12. RULES & PITFALLS ═══
      hr(),
      heading1("12. Important Rules & Pitfalls"),
      heading2("Must-Do"),
      bulletPoint("Always link customers to their chat profile"),
      bulletPoint("Always send cancellation notifications through the system"),
      bulletPoint("Always check availability before confirming bookings"),
      bulletPoint("Always verify club rental reservations before renting out"),
      bulletPoint("Always reply from Unified Chat (LINE/IG/FB) or Meta Business Suite (WhatsApp only)"),
      bulletPoint("Always call customers back - never ask them to call us"),
      bulletPoint("Always double-check AI suggestions before sending"),
      bulletPoint("Always inform the team when unavailable for extended period"),
      emptyLine(),
      heading2("Never Do"),
      bulletPoint("Never mention specific bay numbers to customers"),
      bulletPoint("Never share Ratchavin's availability (except current students)"),
      bulletPoint("Never share coach profiles unless currently available"),
      bulletPoint("Never send club rental details until payment clarified"),
      bulletPoint("Never say \"the owner\" - use \"our policy\""),
      bulletPoint("Never rent out already-reserved clubs"),
      bulletPoint("Never ask customers to call us"),
      bulletPoint("Never commit to large event pricing without David/Dolly"),
      bulletPoint("Never reply to IG/FB from Business Suite - use Unified Chat"),
      emptyLine(),
      heading2("Common Mistakes to Avoid"),
      bulletPoint("Forgetting to create customer before booking"),
      bulletPoint("Sending confirmation manually (it's automatic now)"),
      bulletPoint("Not checking if customer already exists (duplicates)"),
      bulletPoint("Not explaining B1G1 rate rules when crossing periods"),
      bulletPoint("Assuming bay unusable when only auto-tee is down"),
      bulletPoint("Confusing \"20% extra hours\" with \"20% discount\""),
      bulletPoint("Replying IG/FB from Meta Business Suite (breaks tracking)"),
      bulletPoint("Telling customer to call us instead of calling back"),
      bulletPoint("Sharing coach availability without checking Coaching Assist"),
      bulletPoint("Sending AI replies without reading/verifying first"),

      // ═══ KEY CONTACTS ═══
      hr(),
      heading1("Key Contacts & Escalation"),
      makeTable(
        ["Who", "When to Escalate"],
        [
          ["David", "Custom pricing, package exceptions, technical issues, club rental coordination, complex situations"],
          ["Dolly", "Event calls, on-site operations, calling customers back"],
          ["Net", "Food/menu questions, on-site operational questions"],
          ["May", "On-site operations, shift coverage"],
        ],
        [20, 80]
      ),
      emptyLine(),
      heading2("Bank Details (for customer payments)"),
      para("LENGOLF CO. LTD.", { bold: true }),
      para("Kasikorn Bank"),
      para("Account: 1703270294", { bold: true }),
      emptyLine(),
      heading2("Important Links"),
      bulletPoint("Customer self-booking: https://booking.len.golf/"),
      bulletPoint("Events page: https://www.len.golf/events/"),
      bulletPoint("Unified Chat: lengolf-forms.vercel.app/staff/unified-chat"),
      bulletPoint("General email: info@len.golf"),
    ]
  }]
});

// ─── Write to file ─────────────────────────────────────────────────────────

async function main() {
  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, "..", "docs", "operations", "LENGOLF-Admin-Knowledge-Transfer.docx");
  fs.writeFileSync(outPath, buffer);
  console.log(`Written to ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

main().catch(console.error);
