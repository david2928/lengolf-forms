/**
 * Shared store for selected audience ID
 * In production, this would be stored in database, Redis, or similar persistent store
 */

let selectedAudienceId: number | null = null;

export function getSelectedAudienceId(): number | null {
  return selectedAudienceId;
}

export function setSelectedAudienceId(audienceId: number | null): void {
  selectedAudienceId = audienceId;
}