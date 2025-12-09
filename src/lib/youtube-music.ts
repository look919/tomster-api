import YTMusic, { type SearchResult } from "ytmusic-api";
import { writeFileSync } from "fs";
import { join } from "path";
import { prisma } from "./prisma.js";
import play from "play-dl";

const mapDifficulty = (views: number): number => {
  switch (true) {
    case views <= 20_000_000:
      return 10;
    case views <= 50_000_000:
      return 9;
    case views <= 75_000_000:
      return 8;
    case views <= 100_000_000:
      return 7;
    case views <= 250_000_000:
      return 6;
    case views <= 400_000_000:
      return 5;
    case views <= 600_000_000:
      return 4;
    case views <= 1_000_000_000:
      return 3;
    case views <= 2_000_000_000:
      return 2;
    case views > 2_000_000_000:
      return 1;

    default:
      return 5;
  }
};

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
    const results = await ytmusic.search(query);
    // Filter to only include SONG and VIDEO types
    const filtered = results.filter(
      (item: any) => item.type === "SONG" || item.type === "VIDEO"
    );

    console.log(`Found ${filtered.length} songs for query: "${query}"`);
    return filtered;
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
      "rap anthems",
      "rap hits",
      "classic hip hop",
      "hip hop greatest",
      "rap collection",
      "hip hop songs",
      "hip hop music",
      "best hip hop",
      "hip hop best",
      "trap music",
      "trap hits",
      "conscious rap",
      "rap classics",
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
      "synth pop",
      "pop ballads",
      "pop greatest",
      "modern pop",
      "pop songs",
      "dance pop",
      "pop rock",
      "electro pop",
      "pop best",
      "pop legends",
      "mainstream pop",
      "top pop",
    ],
    other: [
      // Country
      "country music",
      "country songs",
      "modern country",
      "country rock",
      "country ballads",
      // Electronic
      "electronic music",
      "house music",
      "dubstep",
      "electro house",
      "drum and bass",
      // Classical
      "classical music",
      "classical masterpieces",
      "baroque music",
      "classical piano",
      "classical violin",
      // Jazz
      "jazz classics",
      "jazz music",
      "smooth jazz",
      "classic jazz",
      "modern jazz",
      // Other genres
      "reggae music",
      "blues music",
      "soul music",
      "r&b hits",
      "funk music",
      "disco hits",
      "folk music",
      "latin music",
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

/**
 * Parse view count string to number
 * Handles formats like "1.2M", "500K", "1.5B", etc.
 */
function parseViewCount(viewString: string): number {
  if (!viewString) return 0;

  // Remove "views" and any non-numeric characters except dots, M, K, B
  const cleaned = viewString.toLowerCase().replace(/[^0-9.mkb]/g, "");

  let multiplier = 1;
  let numStr = cleaned;

  if (cleaned.includes("b")) {
    multiplier = 1_000_000_000;
    numStr = cleaned.replace("b", "");
  } else if (cleaned.includes("m")) {
    multiplier = 1_000_000;
    numStr = cleaned.replace("m", "");
  } else if (cleaned.includes("k")) {
    multiplier = 1_000;
    numStr = cleaned.replace("k", "");
  }

  const num = parseFloat(numStr);
  return isNaN(num) ? 0 : Math.floor(num * multiplier);
}

/**
 * Remove songs from database that have less than specified view count
 * Fetches view counts from YouTube using play-dl and deletes low-view songs
 */
export async function removeLowViewSongs(
  minViews: number = 10_000_000
): Promise<void> {
  try {
    console.log(`\n🔍 Fetching all songs from database...`);
    const songs = await prisma.song.findMany({
      select: {
        id: true,
        youtubeId: true,
        title: true,
        artist: true,
      },
    });

    console.log(`📊 Found ${songs.length} songs in database`);
    console.log(
      `🎯 Checking view counts (minimum: ${minViews.toLocaleString()} views)\n`
    );

    let checked = 0;
    let deleted = 0;
    let kept = 0;
    let errors = 0;

    const videoUrl = `https://www.youtube.com/watch?v=${songs[0]!.youtubeId}`;
    const videoInfo = await play.video_info(videoUrl);
    console.log("Sample video info:", videoInfo);

    for (const song of songs) {
      try {
        // Fetch video info using play-dl
        const videoUrl = `https://www.youtube.com/watch?v=${song.youtubeId}`;
        const videoInfo = await play.video_info(videoUrl);

        if (!videoInfo || !videoInfo.video_details) {
          console.log(`⚠️  No data returned for "${song.title}" - keeping`);
          kept++;
          checked++;
          continue;
        }

        const viewCount = videoInfo.video_details.views;

        if (isNaN(viewCount) || viewCount === 0) {
          console.log(
            `⚠️  Invalid view count for "${song.title}" (${song.youtubeId}) - keeping in database`
          );
          kept++;
          checked++;
          continue;
        }

        if (viewCount < minViews) {
          //   Delete song
          await prisma.song.delete({
            where: { id: song.id },
          });
          deleted++;
          console.log(
            `❌ Deleted "${
              song.title
            }" - ${viewCount.toLocaleString()} views (below ${minViews.toLocaleString()})`
          );
        } else {
          kept++;
          await prisma.song.update({
            where: { id: song.id },
            data: {
              duration: videoInfo.video_details.durationInSec,
              views: viewCount,
              releaseYear: 2030,
              difficulty: mapDifficulty(videoInfo.video_details.views),
            },
          });
        }

        checked++;

        // Progress update every 10 songs
        if (checked % 10 === 0) {
          console.log(
            `\n📈 Progress: ${checked}/${songs.length} (${deleted} deleted, ${kept} kept)\n`
          );
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check if error is age-restricted or other access errors
        if (
          errorMessage.includes("Sign in to confirm your age") ||
          errorMessage.includes("While getting info from url") ||
          errorMessage.includes("age") ||
          errorMessage.includes("restricted")
        ) {
          // Delete song if it has access restrictions
          await prisma.song.delete({
            where: { id: song.id },
          });
          deleted++;
          console.log(
            `❌ Deleted "${song.title}" - Age restricted or access error`
          );
        } else {
          // Keep song for other types of errors
          errors++;
          console.error(
            `❌ Error checking "${song.title}" (${song.youtubeId}):`,
            errorMessage
          );
          kept++;
        }
        checked++;
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎉 Cleanup complete!`);
    console.log(`${"=".repeat(60)}`);
    console.log(`✅ Songs kept: ${kept}`);
    console.log(`❌ Songs deleted: ${deleted}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log(`📊 Total processed: ${checked}`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}
