// LINE Messaging API configuration
export const LINE_MESSAGING = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
  groups: {
    default: process.env.LINE_GROUP_ID || "",
    ratchavin: process.env.LINE_GROUP_RATCHAVIN_ID || "",
    coaching: process.env.LINE_GROUP_COACHING_ID || "",
    noon: process.env.LINE_GROUP_NOON_ID || "",
    min: process.env.LINE_GROUP_MIN_ID || ""
  }
} as const;