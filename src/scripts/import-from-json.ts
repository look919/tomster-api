import play from "play-dl";
import { prisma } from "../lib/prisma.js";
import json from "../../data/rock-songs-2000-2009.json" with { type: "json" };

// HOW TO GET YOUTUBE COOKIE:
// 1. Go to youtube.com in your browser (while logged in)
// 2. Press F12 → Network tab
// 3. Refresh the page
// 4. Click any request to youtube.com
// 5. In Headers section, find "Cookie:" and copy the ENTIRE value
// 6. Create a .env file and add: YOUTUBE_COOKIE=paste_here
//
// Example format: CONSENT=YES+...; VISITOR_INFO1_LIVE=...; YSC=...; PREF=...

  // await play.setToken({
  //   youtube: {
  //     cookie: "LOGIN_INFO=AFmmF2swRgIhALrDP75GoQGSCsUFLbYuDnXzQahbjUDna528sjZzm7HVAiEA8DNwDQ_OcHefUJTYAQyzN1cAMq0u1QldIS7YZuxCV5w:QUQ3MjNmem9fa0E3S0Z4VVRqODllUThMYVlnZ1lWQnZmek1Kc3pVRTN0dG8yTUdaR09wZEFZQkVrMkpDeDJHOFhsaV9wQ1BLVGNWbEZ2RXRzMnBMYnF1ZE91c2kwbFIyNXVVanZEVDR6Z1dNdVA0eVZPNVdJdktJSXVGT1V5N3ZoWFdnWkxRV3RiVjltd3NQUHg0SVpDNldaTWFoOG52ZWFR; PREF=f6=40000001&tz=Europe.Warsaw&f5=30000&f7=100; __Secure-YENID=12.YTE=EVCbdTWlzmNqbsfJl2dAflq8iFo0IaMBN5KuJnhTdPvVbGfWlJUQ-qPnRVI3OUg1ij-Zld8b9o4ISBEPCDfugpeeSkmLnNjIAztQGJZ07iBwNfVVUz8dJ90UK9w82Av7h7zzYXZe438Ia-yPTZEII9E5uay3YHj7qe3j_V7ywQ2wm1xVRy8T91N_xxcXR1gomcFCrow5GXKYW9oxdEIMxZW2EfdOl_1VhAOd2GhA8_oz2QuJaiGKgVw8HAwgHK3pzg-_8Ww2y12Ad-_X8HOasKZMo-_YzSUzbzrtzskHgzQ2n-sj9mKYqm0bHDk2Km8BKsikQcFOGvBzXbC3biwQ2Q; YSC=_MbgdE2CvrE; __Secure-ROLLOUT_TOKEN=CJTZ07Pi_rF8EKabquKD64oDGIjK6q7fsJED; wide=0; HSID=ADTLaR4vKrxDzoKvi; SSID=A-p5X8FK0kPRIHJfN; APISID=64ZqNUtHLGj3Aqwj/AMsZFJ5JOOHvEIWQv; SAPISID=GMbbYetaeEO9HZc7/ADhD-_gc3n4Z8CeqR; __Secure-1PAPISID=GMbbYetaeEO9HZc7/ADhD-_gc3n4Z8CeqR; __Secure-3PAPISID=GMbbYetaeEO9HZc7/ADhD-_gc3n4Z8CeqR; SID=g.a0004Qj06pyD4DuftML1DI1fnFykv34t1mUzSBwtGKyUfKFPbymXf-WdP-LlOsHjpwdaXMlxtgACgYKAUsSARcSFQHGX2Mick3R4FYviTHmJqbyWXwi8hoVAUF8yKr_jx8tBWHD5b1T5VtRhrTk0076; __Secure-1PSID=g.a0004Qj06pyD4DuftML1DI1fnFykv34t1mUzSBwtGKyUfKFPbymX3jDnKwQWJo24q1tiDNjQhQACgYKAdgSARcSFQHGX2MiMd_QYtlx27qfuJbELiUl3xoVAUF8yKormf11nSqtUJa7cwbmH5G40076; __Secure-3PSID=g.a0004Qj06pyD4DuftML1DI1fnFykv34t1mUzSBwtGKyUfKFPbymX0pExM96KNvQvcYeshmbgLwACgYKAUgSARcSFQHGX2Miif1PBJ34Trwtzkdpx1PoqRoVAUF8yKoC_Ssq9-isQ-xL70t4fj2e0076; VISITOR_PRIVACY_METADATA=CgJQTBIhEh0SGwsMDg8QERITFBUWFxgZGhscHR4fICEiIyQlJiAp; __Secure-1PSIDTS=sidts-CjQBflaCdddUCGC3VNteRJYt6Kl4gQinV93elZgbWtEu2nKCIGRrBOP6cLlz2pEbp92ZKZzaEAA; __Secure-3PSIDTS=sidts-CjQBflaCdddUCGC3VNteRJYt6Kl4gQinV93elZgbWtEu2nKCIGRrBOP6cLlz2pEbp92ZKZzaEAA; __Secure-YEC=CgtHN3FudUJ2VGJNVSiUhuLJBjInCgJQTBIhEh0SGwsMDg8QERITFBUWFxgZGhscHR4fICEiIyQlJiAp; VISITOR_PRIVACY_METADATA=CgJQTBIhEh0SGwsMDg8QERITFBUWFxgZGhscHR4fICEiIyQlJiAp; SIDCC=AKEyXzXrM86utvco7SP9Z8_wglp3BNE1_9kmiL81U04S694RlSRpnY3EbSIAab5P_4oUn8Sp7kg; __Secure-1PSIDCC=AKEyXzXdDSdVR0gU9KXpttUvHdavY99QuUOIPCFyQ7zFLQVsaxR36W7jL4rlmxP2QRF8sePWdPU; __Secure-3PSIDCC=AKEyXzXbPtwG7LeMaBNmtUZDZF9rWmbIzt5CZuJcKrqsH_9Iij-z1qAqRHNzIIgejiq7YiPf3mK7"
  //   }
  // });
  console.log("✅ YouTube authentication loaded from cookie\n");


const mapDifficulty = (views: number): number => {
  switch (true) {
    case views <= 40_000_000:     
      return 10;    //29 20_000_000
    case views <= 50_000_000:
      return 9;   //50 50_000_000
    case views <= 75_000_000:
      return 8;   //25 75_000_000
    case views <= 100_000_000:
      return 7;     //24 100_000_000
    case views <= 150_000_000:
      return 6;        //23 150_000_000
    case views <= 200_000_000:
      return 5;            //36 225_000_000
    case views <= 250_000_000:  
      return 4;                //26 350_000_000
    case views <= 300_000_000:  
      return 3;              //12 500_000_000
    case views <= 400_000_000:  
      return 2;               //3 750_000_000
    case views > 400_000_000:         
      return 1;               //1 750_000_000: 

    default:
      return 5;
  }
};

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
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    const existingSongsMap = new Map(existingSongs.map((s) => [s.youtubeId, s]));
    console.log(`Found ${existingSongs.length} existing songs in database`);

    // Step 2: Process existing songs (add categories if needed)
    const categoriesToAdd = [];
    for (const song of data.songs) {
      const existingSong = existingSongsMap.get(song.videoId);
      if (existingSong) {
        const hasCategory = existingSong.categories.some(
          (sc) => sc.category.id === category.id
        );

        if (hasCategory) {
          skipped++;
        } else {
          categoriesToAdd.push({
            songId: existingSong.id,
            categoryId: category.id,
          });
          updated++;
        }
      }
    }

    // Batch create category associations
    if (categoriesToAdd.length > 0) {
      await prisma.songCategory.createMany({
        data: categoriesToAdd,
        skipDuplicates: true,
      });
      console.log(`✅ Added category to ${categoriesToAdd.length} existing songs`);
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
              importedAt: new Date(),
              categories: {
                create: {
                  categoryId: category.id,
                },
              },
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
