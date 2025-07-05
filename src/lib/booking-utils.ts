/**
 * Generates a unique booking ID string matching the format used in the refactor project.
 * Format: BK + YYMMDD + 4 random uppercase alphanumeric characters.
 * Example: BK240727ABCD
 */
export const generateBookingId = (): string => {
  const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomNum = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK${timestamp}${randomNum}`;
}; 