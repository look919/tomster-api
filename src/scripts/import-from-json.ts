#!/usr/bin/env node
import { prisma } from "../lib/prisma.js";
import json from "../../data/rock-songs-1960-1969.json" with { type: "json" };
import play from "play-dl";

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
    
    console.log(`\n📂 Importing file: rock-songs-2020-2025.json\n`);

    console.log(`🏷️  Category: ${data.category}`);
    console.log(`📊 Songs in file: ${data.songs.length}`);

    // Extract year from yearRange
    let releaseYear = 2000;
    if (data.yearRange) {
      // Use middle year of range
      releaseYear = Math.floor((data.yearRange.start + data.yearRange.end) / 2);
    }
    console.log(`📅 Release year: ${releaseYear}\n`);

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

    const minViews = 10_000_000;
    console.log(`🎯 Minimum views required: ${minViews.toLocaleString()}\n`);

    for (const song of data.songs) {
      try {
        // Check if song exists
        const existingSong = await prisma.song.findUnique({
          where: { youtubeId: song.videoId },
          include: {
            categories: {
              include: {
                category: true,
              },
            },
          },
        });

        if (existingSong) {
          // Check if this category is already assigned
          const hasCategory = existingSong.categories.some(
            (sc) => sc.category.id === category.id
          );

          if (hasCategory) {
            skipped++;
          } else {
            // Add new category to existing song
            await prisma.songCategory.create({
              data: {
                songId: existingSong.id,
                categoryId: category.id,
              },
            });
            updated++;
            console.log(
              `🔄 Updated: "${song.name}" (added ${category.name} category)`
            );
          }
        } else {
          // Check view count before adding new song
          try {
            const videoUrl = `https://www.youtube.com/watch?v=${song.videoId}`;
            const videoInfo = await play.video_info(videoUrl);

            if (!videoInfo || !videoInfo.video_details) {
              console.log(`⚠️  No data for "${song.name}" - skipping`);
              skipped++;
              continue;
            }

            const viewCount = videoInfo.video_details.views;

            if (isNaN(viewCount) || viewCount < minViews) {
              belowThreshold++;
              console.log(
                `⏭️  Skipped "${song.name}" - ${viewCount.toLocaleString()} views (below ${minViews.toLocaleString()})`
              );
              continue;
            }

            // Create new song only if it meets view threshold
            await prisma.song.create({
              data: {
                title: song.name,
                youtubeId: song.videoId,
                duration: 60,
                difficulty: Math.floor(Math.random() * 10) + 1,
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
            });
            added++;
            if (added % 10 === 0) {
              console.log(`✨ Added ${added} songs...`);
            }

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (viewError) {
            const errorMessage = viewError instanceof Error ? viewError.message : String(viewError);
            
            // Check if error is age-restricted or other access errors
            if (
              errorMessage.includes("Sign in to confirm your age") ||
              errorMessage.includes("While getting info from url") ||
              errorMessage.includes("age") ||
              errorMessage.includes("restricted")
            ) {
              accessErrors++;
              console.log(
                `⏭️  Skipped "${song.name}" - Age restricted or access error`
              );
            } else {
              console.error(`❌ Error checking views for "${song.name}":`, errorMessage);
              skipped++;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing "${song.name}":`, error);
        skipped++;
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
