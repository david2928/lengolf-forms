export type BayName = "Bay 1 (Bar)" | "Bay 2" | "Bay 3 (Entrance)";
export type BookingType = "Coaching (Boss)" | "Coaching (Boss - Ratchavin)";

export const BAY_CALENDARS: Record<BayName, string> = {
  "Bay 1 (Bar)": process.env.BAY_1_CALENDAR_ID || "",
  "Bay 2": process.env.BAY_2_CALENDAR_ID || "",
  "Bay 3 (Entrance)": process.env.BAY_3_CALENDAR_ID || ""
};

export const COACHING_CALENDARS: Record<BookingType, string> = {
  "Coaching (Boss)": process.env.COACHING_BOSS_CALENDAR_ID || "",
  "Coaching (Boss - Ratchavin)": process.env.COACHING_RATCHAVIN_CALENDAR_ID || ""
};

export const BAY_COLORS: Record<BayName, string> = {
  "Bay 1 (Bar)": "7", 
  "Bay 2": "6",       
  "Bay 3 (Entrance)": "4", 
};

export const LINE_TOKENS = {
  default: process.env.LINE_TOKEN_DEFAULT || "",
  coaching: process.env.LINE_TOKEN_COACHING || "",
  ratchavin: process.env.LINE_TOKEN_RATCHAVIN || ""
  // default: "APXGbayv3wLNRIWhGxy3g82PLwZQLSQmsxcTD55WcNG",
  // coaching: "APXGbayv3wLNRIWhGxy3g82PLwZQLSQmsxcTD55WcNG",
  // ratchavin: "APXGbayv3wLNRIWhGxy3g82PLwZQLSQmsxcTD55WcNG"
} as const;