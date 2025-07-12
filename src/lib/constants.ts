export type BayName = "Bay 1 (Bar)" | "Bay 2" | "Bay 3 (Entrance)";

export const BAY_CALENDARS: Record<BayName, string> = {
  "Bay 1 (Bar)": process.env.BAY_1_CALENDAR_ID || "",
  "Bay 2": process.env.BAY_2_CALENDAR_ID || "",
  "Bay 3 (Entrance)": process.env.BAY_3_CALENDAR_ID || ""
};

// LINE Messaging API configuration
export const LINE_MESSAGING = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
  groups: {
    default: process.env.LINE_GROUP_ID || "",
    ratchavin: process.env.LINE_GROUP_RATCHAVIN_ID || "",
    coaching: process.env.LINE_GROUP_COACHING_ID || "",
    noon: process.env.LINE_GROUP_NOON_ID || ""
  }
} as const;