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

// LINE Messaging API configuration
export const LINE_MESSAGING = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
  groups: {
    default: process.env.LINE_GROUP_ID || "",
    ratchavin: process.env.LINE_GROUP_RATCHAVIN_ID || "",
    coaching: process.env.LINE_GROUP_COACHING_ID || ""
  }
} as const;