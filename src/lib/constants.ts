export type BayName = "Bay 1 (Bar)" | "Bay 2" | "Bay 3 (Entrance)";
export type BookingType = "Coaching (Boss)" | "Coaching (Boss - Ratchavin)";

export const BAY_CALENDARS: Record<BayName, string> = {
  "Bay 1 (Bar)": "a6234ae4e57933edb48a264fff4c5d3d3653f7bedce12cfd9a707c6c0ff092e4@group.calendar.google.com",
  "Bay 2": "3a700346dd902abd4aa448ee63e184a62f05d38bb39cb19a8fc27116c6df3233@group.calendar.google.com",
  "Bay 3 (Entrance)": "092757d971c313c2986b43f4c8552382a7e273b183722a44a1c4e1a396568ca3@group.calendar.google.com"
};

export const COACHING_CALENDARS: Record<BookingType, string> = {
  "Coaching (Boss)": "c449fb0b0ebcd0b0df609277bc1997d682dada28b998796fd9cb7757a0392a54@group.calendar.google.com",
  "Coaching (Boss - Ratchavin)": "880463b6afee92b7de81545f6c25a002a26c1729ddaa5f1e291ece9e49366da1@group.calendar.google.com"
};

export const BAY_COLORS: Record<BayName, string> = {
  "Bay 1 (Bar)": "7", 
  "Bay 2": "6",       
  "Bay 3 (Entrance)": "4", 
};

export const LINE_TOKENS = {
  default: "YRINS1gJ5RWzoA28SSAeWzcaD6CWy1UPvizQKgZ6huU",
  coaching: "5lVtdAxEQMyBbGlrDpbFGZvXmAovFxh9zpga3YhFxZ3",
  ratchavin: "SCsuluAwM81JhP4N3RvfqG3y6GGqnFWz5ZSn6NPKM93"
  // default: "APXGbayv3wLNRIWhGxy3g82PLwZQLSQmsxcTD55WcNG",
  // coaching: "APXGbayv3wLNRIWhGxy3g82PLwZQLSQmsxcTD55WcNG",
  // ratchavin: "APXGbayv3wLNRIWhGxy3g82PLwZQLSQmsxcTD55WcNG"
} as const;