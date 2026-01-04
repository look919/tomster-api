import play from "play-dl";
import { prisma } from "../../lib/prisma.js";
import json from "../../../data/pop-songs-2020-2025.json" with { type: "json" };


  await play.setToken({
    youtube: {
      cookie: ""
    }
    });


const mapDifficulty = (views: number): number => {
  if (views < 35_000_000) return 5;
  if( views < 50_000_000) return 4;
  if (views < 100_000_000) return 3;
  if (views < 200_000_000) return 2;

  return 1;
}

interface JsonSong {
  videoId: string;
  name: string;
  artist: string;
}

interface JsonData {
  category: string;
  yearRange?: { start: number; end: number } | null;
  totalSongs: number;
  searchedAt: string;
  songs: JsonSong[];
}

async function importFromJson() {
  try {
    // ========================================
    // CONFIGURE FILE TO IMPORT HERE
    // ========================================
    // Change the import path at the top of the file to import a different JSON file
    // ========================================

    const data: JsonData = json as JsonData;
    

    console.log(`🏷️  Category: ${data.category}`);
    console.log(`📊 Songs in file: ${data.songs.length}`);


    // Ensure category exists in database
    const category = await prisma.category.upsert({
      where: { name: data.category.toLowerCase() },
      update: {},
      create: { name: data.category.toLowerCase() },
    });

    let added = 0;
    let updated = 0;
    let skipped = 0;
    let belowThreshold = 0;
    let accessErrors = 0;

    const minViews = 30_000_000;

    // Step 1: Batch check existing songs in database
    console.log("📋 Checking existing songs in database...");
    const existingSongs = await prisma.song.findMany({
      where: {
        youtubeId: {
          in: data.songs.map((s) => s.videoId),
        },
      },
      include: {
        category: true,
      },
    });

    const existingSongsMap = new Map(existingSongs.map((s) => [s.youtubeId, s]));
    console.log(`Found ${existingSongs.length} existing songs in database`);

    // Step 2: Process existing songs (skip songs that already have this category)
    for (const song of data.songs) {
      const existingSong = existingSongsMap.get(song.videoId);
      if (existingSong) {
        if (existingSong.category?.id === category.id) {
          skipped++;
        } else {
          // Update song to set this category
          await prisma.song.update({
            where: { id: existingSong.id },
            data: { categoryId: category.id },
          });
          updated++;
        }
      }
    }

    if (updated > 0) {
      console.log(`✅ Updated category on ${updated} existing songs`);
    }

    // Step 3: Process new songs with parallel API calls (in batches)
    const newSongs = data.songs.filter((song) => !existingSongsMap.has(song.videoId));
    console.log(`\n📥 Processing ${newSongs.length} new songs...\n`);

    const BATCH_SIZE = 10; // Process 10 videos in parallel at a time
    const DELAY_BETWEEN_REQUESTS = 200; // 200ms between each request in batch
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches
    
    for (let i = 0; i < newSongs.length; i += BATCH_SIZE) {
      const batch = newSongs.slice(i, i + BATCH_SIZE);
      const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(newSongs.length / BATCH_SIZE);
      
      console.log(`🔄 Processing batch ${currentBatch}/${totalBatches} (songs ${i + 1}-${Math.min(i + BATCH_SIZE, newSongs.length)}/${newSongs.length})...`);
      
      const promises = batch.map(async (song, index) => {
        // Stagger requests within the batch to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * DELAY_BETWEEN_REQUESTS));
        
        try {
          const videoUrl = `https://www.youtube.com/watch?v=${song.videoId}`;
          const videoInfo = await play.video_info(videoUrl);

          if (!videoInfo || !videoInfo.video_details) {
            return { status: "no-data", song };
          }

          const viewCount = videoInfo.video_details.views;

          if (isNaN(viewCount) || viewCount < minViews) {
            return { status: "below-threshold", song };
          }

          const releaseYear = videoInfo.video_details.uploadedAt
            ? new Date(videoInfo.video_details.uploadedAt).getFullYear()
            : 2030;

          return {
            status: "success",
            song,
            data: {
              title: song.name,
              youtubeId: song.videoId,
              duration: videoInfo.video_details.durationInSec || 60,
              views: viewCount,
              difficulty: mapDifficulty(viewCount),
              countryOrigin: "international",
              releaseYear: releaseYear,
              artist: song.artist,
              categoryId: category.id,
            },
          };
        } catch (viewError) {
          const errorMessage =
            viewError instanceof Error ? viewError.message : String(viewError);

          // Only treat as access error if it's specifically about age restriction or bot detection
          if (
            errorMessage.includes("Sign in to confirm your age") ||
            errorMessage.includes("Sign in to confirm you're not a bot") ||
            errorMessage.includes("age-restricted") ||
            errorMessage.includes("This video is age restricted")
          ) {
            return { status: "access-error", song, error: errorMessage };
          } else {
            // Log the actual error for debugging
            console.log(`   ⚠️  Error for "${song.name}": ${errorMessage.substring(0, 100)}`);
            return { status: "error", song, error: errorMessage };
          }
        }
      });

      const results = await Promise.all(promises);

      // Process results and create songs
      const songsToCreate = results
        .filter((r) => r.status === "success")
        .map((r: any) => r.data);

      if (songsToCreate.length > 0) {
        // Create songs individually (createMany doesn't support nested creates)
        for (const songData of songsToCreate) {
          try {
            await prisma.song.create({ data: songData });
            added++;
          } catch (error) {
            console.error(`❌ Error creating song "${songData.title}":`, error);
            skipped++;
          }
        }
      }

      // Count other statuses
      for (const result of results) {
        if (result.status === "no-data" || result.status === "error") {
          skipped++;
          if (result.status === "error") {
            console.error(`❌ Error for "${result.song.name}": ${(result as any).error}`);
          }
        } else if (result.status === "below-threshold") {
          belowThreshold++;
        } else if (result.status === "access-error") {
          accessErrors++;
        }
      }

      console.log(`   ✅ Added: ${songsToCreate.length} | ⏭️  Below threshold: ${results.filter(r => r.status === "below-threshold").length} | 🚫 Access errors: ${results.filter(r => r.status === "access-error").length} | ⚠️  Errors: ${results.filter(r => r.status === "error" || r.status === "no-data").length}\n`);
      
      // Add delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < newSongs.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎉 Import complete!`);
    console.log(`${"=".repeat(60)}`);
    console.log(`✨ Added: ${added} new songs`);
    console.log(`🔄 Updated: ${updated} songs (added category)`);
    console.log(`⏭️  Skipped: ${skipped} songs (already exist or errors)`);
    console.log(`📉 Below threshold: ${belowThreshold} songs (< ${minViews.toLocaleString()} views)`);
    console.log(`🚫 Access errors: ${accessErrors} songs (age-restricted)`);
    console.log(`📊 Total in file: ${data.songs.length}`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importFromJson();
