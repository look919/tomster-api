/**
 * Utility functions for working with category IDs from environment variables
 */

/**
 * Parse category IDs from environment variable
 * Supports colon-separated format: "id1:id2:id3"
 */
export function parseCategoryIds(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(":")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Load all category groups from environment variables
 * Returns an object with POP, RAP, ROCK, and OTHER arrays
 */
export function loadCategoryGroups() {
  return {
    POP: parseCategoryIds(process.env.CATEGORY_POP),
    RAP: parseCategoryIds(process.env.CATEGORY_RAP),
    ROCK: parseCategoryIds(process.env.CATEGORY_ROCK),
    OTHER: parseCategoryIds(process.env.CATEGORY_OTHER),
  };
}
