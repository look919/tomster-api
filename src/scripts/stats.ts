#!/usr/bin/env node
import { prisma } from "../lib/prisma.js";
import { Command } from "commander";

const program = new Command();

program
  .name("stats")
  .description("Display song database statistics with optional filtering")
  .option(
    "-c, --category <name>",
    "Filter by category name (or 'all' for all categories)",
    "all"
  )
  .option(
    "-o, --country <name>",
    "Filter by country origin (or 'all' for all countries)",
    "all"
  )
  .parse();

const options = program.opts();

async function getStats() {
  try {
    const categoryFilter = options.category;
    const countryFilter = options.country;

    // Build where clause for filtering
    const whereClause: any = {};

    if (countryFilter !== "all") {
      whereClause.countryOrigin = countryFilter;
    }

    if (categoryFilter !== "all") {
      whereClause.categories = {
        some: {
          category: {
            name: categoryFilter,
          },
        },
      };
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 SONG DATABASE STATISTICS");
    console.log("=".repeat(80));

    if (categoryFilter !== "all") {
      console.log(`🏷️  Category filter: ${categoryFilter}`);
    }
    if (countryFilter !== "all") {
      console.log(`🌍 Country filter: ${countryFilter}`);
    }
    console.log();

    // Get total songs (with filters applied)
    const totalSongs = await prisma.song.count({ where: whereClause });
    console.log(`🎵 Total songs (filtered): ${totalSongs}\n`);

    if (totalSongs === 0) {
      console.log("⚠️  No songs found matching the filters.\n");
      console.log("=".repeat(80) + "\n");
      return;
    }

    // Get songs by category
    console.log("📁 SONGS BY CATEGORY:");
    console.log("-".repeat(80));

    // If filtering by specific category, only show that one
    let categoriesToShow: any[];
    if (categoryFilter !== "all") {
      const specificCategory = await prisma.category.findUnique({
        where: { name: categoryFilter },
        include: {
          songs: {
            ...(countryFilter !== "all" && {
              where: {
                song: {
                  countryOrigin: countryFilter,
                },
              },
            }),
            include: {
              song: true,
            },
          },
        },
      });
      categoriesToShow = specificCategory ? [specificCategory] : [];
    } else {
      categoriesToShow = await prisma.category.findMany({
        include: {
          songs: {
            ...(countryFilter !== "all" && {
              where: {
                song: {
                  countryOrigin: countryFilter,
                },
              },
            }),
            include: {
              song: true,
            },
          },
        },
      });
    }

    for (const category of categoriesToShow) {
      const songCount = category.songs.length;

      if (songCount === 0) continue;

      console.log(`\n${category.name.toUpperCase()}: ${songCount} songs`);

      // Get difficulty distribution for this category
      const categoryWhere: any = {
        categories: {
          some: {
            categoryId: category.id,
          },
        },
      };

      if (countryFilter !== "all") {
        categoryWhere.countryOrigin = countryFilter;
      }

      const difficultyStats = await prisma.song.findMany({
        where: categoryWhere,
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
      where: whereClause,
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
      where: whereClause,
      _avg: { views: true },
      _min: { views: true },
      _max: { views: true },
    });

    const yearStats = await prisma.song.aggregate({
      where: whereClause,
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

    // Country origin stats (only show if not filtering by country)
    if (countryFilter === "all") {
      const countryWhere: any = {};
      if (categoryFilter !== "all") {
        countryWhere.categories = {
          some: {
            category: {
              name: categoryFilter,
            },
          },
        };
      }

      const countryStats = await prisma.song.groupBy({
        by: ["countryOrigin"],
        where: countryWhere,
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
    } else {
      console.log(`\n🌍 Country origin: ${countryFilter} (filtered)`);
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
