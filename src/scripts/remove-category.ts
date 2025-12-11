#!/usr/bin/env node
import { prisma } from "../lib/prisma.js";

async function removeCategoryFromSongs() {
  try {
    // ========================================
    // ADD SONG IDs TO REMOVE CATEGORY FROM
    // ========================================
    const songIds = [""];

    const categoryName = "local"; // Change this if needed
    // ========================================

    console.log("\n" + "=".repeat(60));
    console.log("🔗 REMOVE CATEGORY FROM SONGS");
    console.log("=".repeat(60) + "\n");

    if (songIds.length === 0) {
      console.log("⚠️  No song IDs provided.");
      console.log(
        "   Please add song IDs to the 'songIds' array in the script.\n"
      );
      return;
    }

    console.log(`📋 Songs to process: ${songIds.length}`);
    console.log(`🏷️  Category to remove: "${categoryName}"\n`);

    // Get the category
    const category = await prisma.category.findUnique({
      where: { name: categoryName },
    });

    if (!category) {
      console.log(`❌ Category "${categoryName}" not found in database.\n`);
      return;
    }

    // Fetch songs with their current categories
    console.log("🔍 Fetching song details...\n");
    const songs = await prisma.song.findMany({
      where: {
        id: {
          in: songIds,
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

    if (songs.length === 0) {
      console.log("❌ No matching songs found in database.\n");
      return;
    }

    console.log(`✅ Found ${songs.length} matching songs:\n`);

    const songsWithCategory = songs.filter((s) =>
      s.categories.some((sc) => sc.category.name === categoryName)
    );
    const songsWithoutCategory = songs.filter(
      (s) => !s.categories.some((sc) => sc.category.name === categoryName)
    );

    if (songsWithCategory.length > 0) {
      console.log(`Songs with "${categoryName}" category (will be removed):`);
      for (const song of songsWithCategory) {
        const otherCategories = song.categories
          .filter((sc) => sc.category.name !== categoryName)
          .map((sc) => sc.category.name)
          .join(", ");
        console.log(`   • ${song.title} - ${song.artist}`);
        console.log(`     ID: ${song.id}`);
        console.log(`     Other categories: ${otherCategories || "none"}\n`);
      }
    }

    if (songsWithoutCategory.length > 0) {
      console.log(`\nSongs without "${categoryName}" category (will skip):`);
      for (const song of songsWithoutCategory) {
        const categories = song.categories
          .map((sc) => sc.category.name)
          .join(", ");
        console.log(`   • ${song.title} - ${song.artist}`);
        console.log(`     Categories: ${categories || "none"}\n`);
      }
    }

    // Check for IDs that don't exist
    const foundIds = new Set(songs.map((s) => s.id));
    const notFoundIds = songIds.filter((id) => !foundIds.has(id));

    if (notFoundIds.length > 0) {
      console.log(`⚠️  ${notFoundIds.length} song IDs not found in database:`);
      for (const id of notFoundIds) {
        console.log(`   • ${id}`);
      }
      console.log();
    }

    if (songsWithCategory.length === 0) {
      console.log(
        `ℹ️  No songs have the "${categoryName}" category. Nothing to remove.\n`
      );
      return;
    }

    const deleteResult = await prisma.songCategory.deleteMany({
      where: {
        songId: {
          in: songsWithCategory.map((s) => s.id),
        },
        categoryId: category.id,
      },
    });

    console.log("=".repeat(60));
    console.log("✅ REMOVAL COMPLETE");
    console.log("=".repeat(60));
    console.log(
      `🔗 Removed "${categoryName}" category from ${deleteResult.count} songs\n`
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeCategoryFromSongs();
