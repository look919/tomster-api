#!/usr/bin/env node
import { prisma } from "../lib/prisma.js";

async function getStats() {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("📊 SONG DATABASE STATISTICS");
    console.log("=".repeat(80) + "\n");

    // Get total songs
    const totalSongs = await prisma.song.count();
    console.log(`🎵 Total songs in database: ${totalSongs}\n`);

    // Get songs by category
    console.log("📁 SONGS BY CATEGORY:");
    console.log("-".repeat(80));

    const categories = await prisma.category.findMany({
      include: {
        songs: {
          include: {
            song: true,
          },
        },
      },
    });

    for (const category of categories) {
      const songCount = category.songs.length;
      console.log(`\n${category.name.toUpperCase()}: ${songCount} songs`);

      // Get difficulty distribution for this category
      const difficultyStats = await prisma.song.findMany({
        where: {
          categories: {
            some: {
              categoryId: category.id,
            },
          },
        },
        select: {
          difficulty: true,
        },
      });

      const difficultyMap = new Map<number, number>();
      for (const song of difficultyStats) {
        const count = difficultyMap.get(song.difficulty) || 0;
        difficultyMap.set(song.difficulty, count + 1);
      }

      // Sort by difficulty level (1-10)
      const sortedDifficulties = Array.from(difficultyMap.entries()).sort(
        (a, b) => a[0] - b[0]
      );

      console.log("  Difficulty breakdown:");
      for (const [difficulty, count] of sortedDifficulties) {
        const percentage = ((count / songCount) * 100).toFixed(1);
        const bar = "█".repeat(Math.floor(count / 5));
        console.log(
          `    Level ${difficulty.toString().padStart(2)}: ${count
            .toString()
            .padStart(4)} songs (${percentage.padStart(5)}%) ${bar}`
        );
      }
    }

    // Overall difficulty distribution
    console.log("\n" + "=".repeat(80));
    console.log("🎯 OVERALL DIFFICULTY DISTRIBUTION:");
    console.log("-".repeat(80));

    const allDifficulties = await prisma.song.groupBy({
      by: ["difficulty"],
      _count: {
        difficulty: true,
      },
      orderBy: {
        difficulty: "asc",
      },
    });

    for (const diff of allDifficulties) {
      const count = diff._count.difficulty;
      const percentage = ((count / totalSongs) * 100).toFixed(1);
      const bar = "█".repeat(Math.floor(count / 10));
      console.log(
        `Level ${diff.difficulty.toString().padStart(2)}: ${count
          .toString()
          .padStart(4)} songs (${percentage.padStart(5)}%) ${bar}`
      );
    }

    // Additional stats
    console.log("\n" + "=".repeat(80));
    console.log("📈 ADDITIONAL STATISTICS:");
    console.log("-".repeat(80));

    const viewStats = await prisma.song.aggregate({
      _avg: { views: true },
      _min: { views: true },
      _max: { views: true },
    });

    const yearStats = await prisma.song.aggregate({
      _min: { releaseYear: true },
      _max: { releaseYear: true },
    });

    console.log(`\n📺 View count:`);
    console.log(
      `  Average: ${viewStats._avg.views?.toLocaleString() || "N/A"}`
    );
    console.log(
      `  Minimum: ${viewStats._min.views?.toLocaleString() || "N/A"}`
    );
    console.log(
      `  Maximum: ${viewStats._max.views?.toLocaleString() || "N/A"}`
    );

    console.log(`\n📅 Release years:`);
    console.log(`  Oldest: ${yearStats._min.releaseYear || "N/A"}`);
    console.log(`  Newest: ${yearStats._max.releaseYear || "N/A"}`);

    // Country origin stats
    const countryStats = await prisma.song.groupBy({
      by: ["countryOrigin"],
      _count: {
        countryOrigin: true,
      },
    });

    console.log(`\n🌍 By country origin:`);
    for (const country of countryStats) {
      const count = country._count.countryOrigin;
      const percentage = ((count / totalSongs) * 100).toFixed(1);
      console.log(
        `  ${country.countryOrigin}: ${count} songs (${percentage}%)`
      );
    }

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

getStats();
