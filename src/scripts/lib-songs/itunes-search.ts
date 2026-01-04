#!/usr/bin/env node
import { Command } from "commander";
import { prisma } from "../../lib/prisma.js";
import fs from "fs/promises";
import path from "path";

const program = new Command();

interface ITunesSearchResult {
  resultCount: number;
  results: Array<{
    artistName: string;
    trackName: string;
    releaseDate: string;
    primaryGenreName: string;
  }>;
}

interface SongInfo {
  artists: string[];
  releaseDate: number; // year only
  primaryGenreType: string;
  // iTunes returned data for verification
  itunesTrackName: string;
  itunesArtistName: string;
  // Original song data from database
  originalTitle: string;
  originalArtist: string;
}

interface NotFoundInfo {
  found: false;
  artists: string[];
  releaseDate: number; // year from DB
  originalTitle: string;
  originalArtist: string;
  primaryGenreType: string;
}

function normalizePolishDiacritics(text: string): string {
  const polishMap: Record<string, string> = {
    ą: "a",
    ć: "c",
    ę: "e",
    ł: "l",
    ń: "n",
    ó: "o",
    ś: "s",
    ź: "z",
    ż: "z",
    Ą: "A",
    Ć: "C",
    Ę: "E",
    Ł: "L",
    Ń: "N",
    Ó: "O",
    Ś: "S",
    Ź: "Z",
    Ż: "Z",
  };

  return text.replace(
    /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g,
    (char) => polishMap[char] || char
  );
}

function normalizeText(text: string): string {
  return normalizePolishDiacritics(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function getWords(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((word) => word.length > 2) // Ignore very short words
  );
}

function hasCommonWords(text1: string, text2: string): boolean {
  const words1 = getWords(text1);
  const words2 = getWords(text2);

  for (const word of words1) {
    if (words2.has(word)) {
      return true;
    }
  }
  return false;
}

function isGoodMatch(searchTitle: string, resultTitle: string): boolean {
  // Check if there's at least one common word in the title
  const titleMatch = hasCommonWords(searchTitle, resultTitle);

  // We require at least a title match
  // (artist match not required as artists can appear with different names/collaborations)
  return titleMatch;
}

async function searchITunes(
  artist: string,
  trackTitle: string
): Promise<ITunesSearchResult | null> {
  try {
    // Normalize Polish diacritics
    const normalizedTitle = normalizePolishDiacritics(trackTitle);
    const normalizedArtist = normalizePolishDiacritics(artist);

    // Multi-pass search strategy
    const searches = [
      // Pass 1: Artist + clean title
      {
        term: `${artist} ${trackTitle}`,
        label: "artist + title",
      },
      // Pass 2: Normalized (no Polish diacritics)
      {
        term: `${normalizedArtist} ${normalizedTitle}`,
        label: "normalized",
      },
      // Pass 3: Clean title only
      {
        term: trackTitle,
        label: "title only",
      },
    ];

    console.log(`🔍 Searching iTunes: ${artist} - ${trackTitle}`);

    let data: ITunesSearchResult | null = null;

    for (let i = 0; i < searches.length; i++) {
      const search = searches[i]!;
      const searchTerm = encodeURIComponent(search.term);
      const url = `https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=5`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`❌ iTunes API error: ${response.status}`);
        continue;
      }

      data = (await response.json()) as ITunesSearchResult;

      // If we found results, stop searching
      if (data && data.resultCount > 0) {
        if (i > 0) {
          console.log(`   ✓ Found via ${search.label}`);
        }
        break;
      }
    }

    // Filter results to only include good matches
    if (data && data.results.length > 0) {
      const filteredResults = data.results.filter((result) => {
        const isMatch = isGoodMatch(trackTitle, result.trackName);

        return isMatch;
      });

      if (filteredResults.length === 0) {
        return null;
      }

      // Sort filtered results by release date and take the oldest
      filteredResults.sort((a, b) => {
        const dateA = new Date(a.releaseDate).getTime();
        const dateB = new Date(b.releaseDate).getTime();
        return dateA - dateB;
      });

      // Return only the oldest result
      data.results = [filteredResults[0]!];
      data.resultCount = 1;
    }

    return data;
  } catch (error) {
    console.error(`❌ Error searching iTunes:`, error);
    return null;
  }
}

async function fetchSongsFromDB(
  skip: number
): Promise<
  Array<{ id: string; title: string; artist: string; releaseYear: number }>
> {
  const songs = await prisma.song.findMany({
    take: 63,
    skip: skip,
    where: {
      countryOrigin: "international",
      categoryId: "913764d5-4e3d-4e29-9313-40a863513a79",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      title: true,
      artist: true,
      releaseYear: true,
    },
  });

  console.log(`✅ Found ${songs.length} songs in database`);
  return songs;
}

program
  .name("itunes-search")
  .description(
    "Search iTunes API for songs from database and save results to JSON"
  )
  .version("1.0.0");

program
  .option(
    "-s, --skip <number>",
    "Number of songs to skip (for pagination)",
    "0"
  )
  .option("--output-dir <dir>", "Output directory for JSON files", "./data")
  .option("--delay <ms>", "Delay between requests in milliseconds", "1000")
  .action(async (options) => {
    try {
      const { skip, outputDir, delay } = options;
      const skipNum = parseInt(skip, 10);
      const delayMs = parseInt(delay, 10);

      // Create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });

      // Fetch songs from database
      const songs = await fetchSongsFromDB(skipNum);

      if (songs.length === 0) {
        console.log("⚠️  No songs found for the given criteria");
        await prisma.$disconnect();
        return;
      }

      const foundSongs: Record<string, SongInfo> = {};
      const notFoundSongs: Record<string, NotFoundInfo> = {};

      // Search each song in iTunes
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i]!;
        console.log(`\n[${i + 1}/${songs.length}] Processing: ${song.title}`);

        const result = await searchITunes(song.artist, song.title);

        if (result && result.resultCount > 0 && result.results.length > 0) {
          const track = result.results[0]!;

          // Extract artists - split by common separators
          const artistsArray = track.artistName
            .split(/[,&]|\s+feat\.?\s+|\s+ft\.?\s+/i)
            .map((a) => a.trim())
            .filter((a) => a.length > 0);

          // Extract year from release date (format: YYYY-MM-DD)
          const year = parseInt(track?.releaseDate?.split("-")[0] ?? "0", 10);

          foundSongs[song.id] = {
            artists: artistsArray,
            releaseDate: year,
            primaryGenreType: track.primaryGenreName,
            itunesTrackName: track.trackName,
            itunesArtistName: track.artistName,
            originalTitle: song.title,
            originalArtist: song.artist,
          };

          console.log(`✅ Found: ${track.artistName} - ${track.trackName}`);
          console.log(`   Original: ${song.artist} - ${song.title}`);
          console.log(`   Genre: ${track.primaryGenreName}, Year: ${year}`);
        } else {
          // Split artist string by comma or dot
          const artistsArray = song.artist
            .split(/[,.]|\s+feat\.?\s+|\s+ft\.?\s+/i)
            .map((a) => a.trim())
            .filter((a) => a.length > 0);

          notFoundSongs[song.id] = {
            found: false,
            artists: artistsArray,
            releaseDate: song.releaseYear,
            originalTitle: song.title,
            originalArtist: song.artist,
            primaryGenreType: "",
          };
          console.log(`❌ Not found in iTunes`);
        }

        // Add delay between requests to avoid rate limiting
        if (i < songs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // Save results to JSON files
      const foundPath = path.join(outputDir, `found-skip-${skipNum}.json`);
      const notFoundPath = path.join(
        outputDir,
        `not-found-skip-${skipNum}.json`
      );

      await fs.writeFile(foundPath, JSON.stringify(foundSongs, null, 2));
      await fs.writeFile(notFoundPath, JSON.stringify(notFoundSongs, null, 2));

      console.log(`\n📊 Summary:`);
      console.log(`   Total songs: ${songs.length}`);
      console.log(`   Found: ${Object.keys(foundSongs).length}`);
      console.log(`   Not found: ${Object.keys(notFoundSongs).length}`);
      console.log(`\n💾 Results saved to:`);
      console.log(`   Found: ${foundPath}`);
      console.log(`   Not found: ${notFoundPath}`);

      await prisma.$disconnect();
    } catch (error) {
      console.error("❌ Error:", error);
      await prisma.$disconnect();
      process.exit(1);
    }
  });

program.parse();
