#!/usr/bin/env node
import { prisma } from "../lib/prisma.js";
import { Command } from "commander";
import { loadCategoryGroups } from "../lib/category-utils.js";

const program = new Command();

// Category groupings from environment variables
const CATEGORY_GROUPS = loadCategoryGroups();
const CATEGORY_GROUPS_DISPLAY = {
  Pop: CATEGORY_GROUPS.POP,
  Rap: CATEGORY_GROUPS.RAP,
  Rock: CATEGORY_GROUPS.ROCK,
};

// Year ranges for grouping
const YEAR_RANGES = [
  { label: "Before 1979", min: 0, max: 1979 },
  { label: "1980-1989", min: 1980, max: 1989 },
  { label: "1990-1999", min: 1990, max: 1999 },
  { label: "2000-2005", min: 2000, max: 2005 },
  { label: "2005-2010", min: 2005, max: 2010 },
  { label: "2010-2015", min: 2010, max: 2015 },
  { label: "2015-2020", min: 2015, max: 2020 },
  { label: "2020+", min: 2020, max: 9999 },
];

function getYearRangeLabels(year: number): string[] {
  const ranges = YEAR_RANGES.filter((r) => year >= r.min && year <= r.max);
  return ranges.length > 0 ? ranges.map((r) => r.label) : ["Unknown"];
}

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
      whereClause.category = {
        name: categoryFilter,
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

    // Get all categories to identify OTHER
    const allCategories = await prisma.category.findMany();
    const knownCategoryIds = [
      ...CATEGORY_GROUPS_DISPLAY.Pop,
      ...CATEGORY_GROUPS_DISPLAY.Rap,
      ...CATEGORY_GROUPS_DISPLAY.Rock,
    ];
    const otherCategoryIds = allCategories
      .filter((cat) => !knownCategoryIds.includes(cat.id))
      .map((cat) => cat.id);

    // Get songs by grouped categories
    console.log("📁 SONGS BY CATEGORY GROUP:");
    console.log("-".repeat(80));

    const categoryGroups = [
      { name: "Pop", ids: CATEGORY_GROUPS_DISPLAY.Pop },
      { name: "Rap", ids: CATEGORY_GROUPS_DISPLAY.Rap },
      { name: "Rock", ids: CATEGORY_GROUPS_DISPLAY.Rock },
      { name: "OTHER", ids: otherCategoryIds },
    ];

    for (const group of categoryGroups) {
      if (group.ids.length === 0) continue;

      const groupWhere: any = { categoryId: { in: group.ids } };

      if (countryFilter !== "all") {
        groupWhere.countryOrigin = countryFilter;
      }

      const songCount = await prisma.song.count({ where: groupWhere });

      if (songCount === 0) continue;

      console.log(`\n${group.name.toUpperCase()}: ${songCount} songs`);

      // Get difficulty distribution for this category group
      const difficultyStats = await prisma.song.findMany({
        where: groupWhere,
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

    // Release year grouping
    console.log("\n" + "=".repeat(80));
    console.log("📅 SONGS BY RELEASE YEAR:");
    console.log("-".repeat(80));

    const allSongs = await prisma.song.findMany({
      where: whereClause,
      select: {
        releaseYear: true,
      },
    });

    const yearGroupCounts = new Map<string, number>();
    for (const song of allSongs) {
      const labels = getYearRangeLabels(song.releaseYear);
      for (const label of labels) {
        yearGroupCounts.set(label, (yearGroupCounts.get(label) || 0) + 1);
      }
    }

    // Display in the order of YEAR_RANGES
    for (const range of YEAR_RANGES) {
      const count = yearGroupCounts.get(range.label) || 0;
      if (count > 0) {
        const percentage = ((count / totalSongs) * 100).toFixed(1);
        const bar = "█".repeat(Math.floor(count / 10));
        console.log(
          `${range.label.padEnd(15)}: ${count
            .toString()
            .padStart(4)} songs (${percentage.padStart(5)}%) ${bar}`
        );
      }
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
