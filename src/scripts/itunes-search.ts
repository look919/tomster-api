#!/usr/bin/env node
import { Command } from "commander";
import { prisma } from "../lib/prisma.js";
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

    // Sort results by release date and take the oldest
    if (data && data.results.length > 0) {
      data.results.sort((a, b) => {
        const dateA = new Date(a.releaseDate).getTime();
        const dateB = new Date(b.releaseDate).getTime();
        return dateA - dateB;
      });

      // Return only the oldest result
      data.results = [data.results[0]!];
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
  console.log(`📂 Fetching 100 songs from database (skipping ${skip})...`);

  const songs = await prisma.song.findMany({
    take: 100,
    skip: skip,
    orderBy: {
      createdAt: "desc",
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
          const year = parseInt(track?.releaseDate.split("-")[0] ?? "0", 10);

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
          };
          console.log(`❌ Not found in iTunes`);
        }

        // Add delay between requests to avoid rate limiting
        if (i < songs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // Save results to JSON files
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const foundPath = path.join(
        outputDir,
        `found-skip-${skipNum}-${timestamp}.json`
      );
      const notFoundPath = path.join(
        outputDir,
        `not-found-skip-${skipNum}-${timestamp}.json`
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
