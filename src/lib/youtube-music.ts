import YTMusic, { type SearchResult } from "ytmusic-api";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Initialize YouTube Music API client
 */
export async function createYTMusicClient() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  return ytmusic;
}

/**
 * Search for songs on YouTube Music
 * Note: Each search returns ~20 results, so this returns what the API gives us
 */
export async function searchSongs(query: string): Promise<any[]> {
  const ytmusic = await createYTMusicClient();

  try {
    // Use searchSongs() to get only songs (no playlists, albums, etc.)
    const results = await ytmusic.searchSongs(query);

    console.log(`Found ${results.length} songs for query: "${query}"`);
    return results;
  } catch (error) {
    console.error("Error searching YouTube Music:", error);
    throw new Error("Failed to search YouTube Music");
  }
}

/**
 * Search for songs by category/genre
 * Makes multiple searches to accumulate results up to the limit
 * Saves all results to a JSON file in the data directory
 */

type JsonSong = {
  videoId: string;
  name: string;
  artist: string;
};

export async function searchByCategory(
  category: string,
  limit: number = 5000,
  saveToFile: boolean = true,
  yearRange?: { start: number; end: number }
): Promise<JsonSong[]> {
  const queries = getCategoryQueries(category, yearRange);
  const allSongs: JsonSong[] = [];
  const seenIds = new Set<string>();

  const yearInfo = yearRange ? ` (${yearRange.start}-${yearRange.end})` : "";
  console.log(
    `Searching for ${limit} songs in category: ${category}${yearInfo}`
  );
  console.log(`Using ${queries.length} different search queries...`);

  for (const query of queries) {
    // Stop if we've reached our target
    if (seenIds.size >= limit) {
      break;
    }

    const songs: SearchResult[] = await searchSongs(query);

    // Add only unique songs
    for (const song of songs) {
      if (song.type !== "SONG" && song.type !== "VIDEO") {
        continue;
      }

      // Skip compilations, mixes, and playlists
      const nameLower = song.name.toLowerCase();
      const artistLower = song.artist.name.toLowerCase();

      const skipKeywords = [
        // Compilations & Collections
        "compilation",
        "complication",
        "collection",
        "best of",
        "greatest hits",

        // Mixes & Playlists
        " mix",
        "mixtape",
        "playlist",
        "non stop",
        "nonstop",
        "continuous",
        "megamix",
        "dj mix",

        // Time-based compilations
        "hour",
        "minute",
        "1½-hour",
        "2-hour",
        "3-hour",

        // Top lists & charts
        "top 10",
        "top 20",
        "top 50",
        "top 100",
        "top10",
        "top20",
        "top50",
        "top100",

        // Albums
        "full album",
        " album",
        "vol. ",
        "volume ",

        // Live & Concerts
        "live music",
        "live at",
        "live from",
        "concert",
        "koncert",
        "session",

        // Multiple artists (usually compilations)
        " & ",
        " ft ",
        " feat ",
        " featuring ",
        ", ",

        // Covers & Acoustic versions (often compilations)
        "acoustic cover",
        "cover songs",

        // Generic/promotional content
        "various artists",
        "greatest",
        "essential",
        "classics",
        " | ",
        " - ",
        "boost energy",
        "workout",
        "gaming",
        "sleep music",
        "relaxation",
        "meditation",
        "lounge",
        "bar and",

        // Weird/promotional
        "🐲",
        "🔥",
        "⚡",
        "#",
        'from "',
        "soundtrack",
        "ost",

        // Multiple songs in title (indicates compilation)
        "iris, superman, wonderwall",
        "linkin park, creed",
        "of the 90s",
        "80s 90s",
        "of all time",
      ];

      const shouldSkip = skipKeywords.some(
        (keyword) =>
          nameLower.includes(keyword) || artistLower.includes(keyword)
      );

      // Additional check: skip if artist name has multiple comma-separated names
      const hasMultipleArtists =
        (song.artist.name.match(/,/g) || []).length >= 2;

      // Skip if title is too long (likely a compilation)
      const titleTooLong = song.name.length > 80;

      if (shouldSkip || hasMultipleArtists || titleTooLong) {
        continue; // Skip this song
      }

      if (!seenIds.has(song.videoId)) {
        seenIds.add(song.videoId);
        allSongs.push({
          videoId: song.videoId,
          name: song.name,
          artist: song.artist.name,
        });

        if (seenIds.size >= limit) {
          break;
        }
      }
    }
  }

  console.log(`Found ${allSongs.length} unique songs total`);

  // Save to JSON file
  if (saveToFile && allSongs.length > 0) {
    const yearSuffix = yearRange ? `-${yearRange.start}-${yearRange.end}` : "";
    const filename = `${category}-songs${yearSuffix}.json`;
    const filepath = join(process.cwd(), "data", filename);

    try {
      const data = {
        category,
        yearRange: yearRange || null,
        totalSongs: allSongs.length,
        searchedAt: new Date().toISOString(),
        songs: allSongs,
      };

      writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`✅ Saved ${allSongs.length} songs to: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to save JSON file:`, error);
    }
  }

  return allSongs.slice(0, limit);
}

/**
 * Get search queries for a category
 * Returns multiple query variations to get more diverse results
 * Categories: rock (includes punk & metal), rap (includes hip hop), pop, other (country, electronic, classical, jazz), local (polish music)
 */
function getCategoryQueries(
  category: string,
  yearRange?: { start: number; end: number }
): string[] {
  const categoryMap: Record<string, string[]> = {
    rock: [
      "rock classics",
      "rock music",
      "alternative rock",
      "rock hits",
      "classic rock",
      "hard rock",
      "best rock songs",
      "progressive rock",
      "modern rock",
      "rock tracks",
      "soft rock",
      "rock ballads",
      "garage rock",
      "blues rock",
      // Punk subgenre
      "punk rock",
      "punk music",
      "punk songs",
      // Metal subgenre
      "metal music",
      "heavy metal",
      "death metal",
    ],
    rap: [
      "rap top songs",
      "hip hop hits",
      "rap music",
      "hip hop classics",
      "best rap songs",
      "hip hop tracks",
      "underground rap",
      "rap hits",
      "classic hip hop",
      "hip hop greatest",
      "hip hop songs",
      "hip hop music",
      "best hip hop",
      "hip hop best",
      "trap music",
      "trap hits",
      "conscious rap",
      "rap classics",
      "european rap",
      "old school rap",
    ],
    pop: [
      "pop hits",
      "pop music",
      "top pop songs",
      "pop classics",
      "best pop songs",
      "pop favorites",
      "pop tracks",
      "chart pop",
      "pop ballads",
      "pop greatest",
      "modern pop",
      "dance pop",
      "pop rock",
      "electro pop",
      "pop best",
      "european pop",
      "mainstream pop",
      "top pop",
      "trending pop",
      "universal pop",
    ],
    other: [
      // Country
      "country music",
      "country songs",
      "country ballads",
      // Electronic
      "electronic music",
      "house music",
      "dubstep",
      // Classical
      "classical music",
      "classical masterpieces",
      "baroque music",
      // Jazz
      "jazz music",
      "smooth jazz",
      "classic jazz",
      // Other genres
      "reggae music",
      "blues music",
      "soul music",
      "r&b hits",
      "funk music",
      "disco hits",
      "movie/musical songs",
      "eurovision songs",
    ],
    local: [
      // Polish music
      "polska muzyka",
      "polskie przeboje",
      "polskie piosenki",
      "polska muzyka rozrywkowa",
      "polski rock",
      "polska muzyka pop",
      "polskie hity",
      "polskie klasyki",
      "polski hip hop",
      "polska muzyka disco",
      "disco polo",
      "polskie ballady",
      "polska muzyka alternatywna",
      "polska muzyka rockowa",
      "polska muzyka rapowa",
      "polska muzyka popowa",
      "najlepsze polskie piosenki",
      "polskie utwory",
      "polski rock",
    ],
  };

  const baseQueries = categoryMap[category.toLowerCase()] || [
    `${category} music`,
    `${category} hits`,
    `${category} classics`,
    `${category} essentials`,
  ];

  // If year range is provided, create year-specific versions of ALL queries
  if (yearRange) {
    const yearQueries: string[] = [];
    for (let year = yearRange.start; year <= yearRange.end; year++) {
      // Add year to each base query
      for (const query of baseQueries) {
        yearQueries.push(`${query} ${year}`);
      }
    }
    return yearQueries;
  }

  return baseQueries;
}
