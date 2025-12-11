#!/usr/bin/env node
import { prisma } from "../lib/prisma.js";

async function deleteSongs() {
  try {
    // ========================================
    // ADD SONG IDs TO DELETE HERE
    // ========================================
    const songIdsToDelete: string[] = [""];
    // ========================================

    console.log("\n" + "=".repeat(60));
    console.log("🗑️  SONG DELETION TOOL");
    console.log("=".repeat(60) + "\n");

    if (songIdsToDelete.length === 0) {
      console.log("⚠️  No song IDs provided.");
      console.log(
        "   Please add song IDs to the 'songIdsToDelete' array in the script.\n"
      );
      return;
    }

    console.log(`📋 Songs to delete: ${songIdsToDelete.length}\n`);

    // Fetch songs to show what will be deleted
    console.log("🔍 Fetching song details...\n");
    const songsToDelete = await prisma.song.findMany({
      where: {
        id: {
          in: songIdsToDelete,
        },
      },
      select: {
        id: true,
        title: true,
        artist: true,
        views: true,
        difficulty: true,
      },
    });

    if (songsToDelete.length === 0) {
      console.log("❌ No matching songs found in database.\n");
      return;
    }

    console.log(`✅ Found ${songsToDelete.length} matching songs:\n`);
    for (const song of songsToDelete) {
      console.log(`   • ${song.title} - ${song.artist}`);
      console.log(`     ID: ${song.id}`);
      console.log(
        `     Views: ${song.views.toLocaleString()}, Difficulty: ${
          song.difficulty
        }\n`
      );
    }

    // Check for IDs that don't exist
    const foundIds = new Set(songsToDelete.map((s) => s.id));
    const notFoundIds = songIdsToDelete.filter((id) => !foundIds.has(id));

    if (notFoundIds.length > 0) {
      console.log(`⚠️  ${notFoundIds.length} song IDs not found in database:`);
      for (const id of notFoundIds) {
        console.log(`   • ${id}`);
      }
      console.log();
    }

    const deleteResult = await prisma.song.deleteMany({
      where: {
        id: {
          in: songIdsToDelete,
        },
      },
    });

    console.log("=".repeat(60));
    console.log("✅ DELETION COMPLETE");
    console.log("=".repeat(60));
    console.log(`🗑️  Deleted: ${deleteResult.count} songs\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSongs();
