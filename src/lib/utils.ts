import type { ReleaseDateRange } from "../types/game.js";

/**
 * Calculate the release date range based on the release year
 */
export function getReleaseDateRange(
  releaseYear: number | null
): ReleaseDateRange | null {
  if (!releaseYear) return null;

  if (releaseYear < 1980) return "BEFORE_1980";
  if (releaseYear >= 1980 && releaseYear <= 1989) return "RANGE_1980_1989";
  if (releaseYear >= 1990 && releaseYear <= 1999) return "RANGE_1990_1999";
  if (releaseYear >= 2000 && releaseYear <= 2009) return "RANGE_2000_2009";
  if (releaseYear >= 2010 && releaseYear <= 2019) return "RANGE_2010_2019";
  if (releaseYear >= 2020) return "AFTER_2019";

  return null;
}
