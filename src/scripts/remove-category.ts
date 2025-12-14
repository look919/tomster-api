#!/usr/bin/env node
import { prisma } from "../lib/prisma.js";

async function removeCategoryFromSongs() {
  try {
    // ========================================
    // CONFIGURE CATEGORY TO REMOVE
    // ========================================
    const categoryName = "local"; // Change this if needed
    // ========================================

    console.log("\n" + "=".repeat(60));
    console.log("🔗 REMOVE ALL CATEGORY ASSOCIATIONS");
    console.log("=".repeat(60) + "\n");

    console.log(`🏷️  Category to remove: "${categoryName}"\n`);

    // Get the category
    const category = await prisma.category.findUnique({
      where: { name: categoryName },
      include: {
        songs: {
          include: {
            song: true,
          },
        },
      },
    });

    if (!category) {
      console.log(`❌ Category "${categoryName}" not found in database.\n`);
      return;
    }

    console.log(
      `📊 Found ${category.songs.length} songs with "${categoryName}" category\n`
    );

    if (category.songs.length === 0) {
      console.log(
        `ℹ️  No songs have the "${categoryName}" category. Nothing to remove.\n`
      );
      return;
    }

    // Show sample of songs (first 20)
    console.log("Sample of songs that will lose this category:\n");
    const sampleSongs = category.songs.slice(0, 20);
    for (const songCategory of sampleSongs) {
      console.log(
        `   • ${songCategory.song.title} - ${songCategory.song.artist}`
      );
    }

    if (category.songs.length > 20) {
      console.log(`   ... and ${category.songs.length - 20} more songs\n`);
    } else {
      console.log();
    }

    console.log(
      "⚠️  WARNING: This will remove ALL connections between songs and the 'local' category."
    );
    console.log("⚠️  The songs themselves will NOT be deleted.\n");

    console.log("=".repeat(60));
    console.log("🔗 Removing all category associations...\n");

    const deleteResult = await prisma.songCategory.deleteMany({
      where: {
        categoryId: category.id,
      },
    });

    console.log(
      `✅ Removed "${categoryName}" category from ${deleteResult.count} songs\n`
    );

    // Delete the category itself
    console.log(`🗑️  Deleting "${categoryName}" category...\n`);

    await prisma.category.delete({
      where: {
        id: category.id,
      },
    });

    console.log("=".repeat(60));
    console.log("✅ REMOVAL COMPLETE");
    console.log("=".repeat(60));
    console.log(
      `🔗 Removed "${categoryName}" category associations: ${deleteResult.count} songs`
    );
    console.log(`🗑️  Deleted "${categoryName}" category from database`);
    console.log(`📊 Songs remain in database with their other categories\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeCategoryFromSongs();
