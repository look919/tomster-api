import { prisma } from "../lib/prisma.js";
import fs from "fs/promises";
import path from "path";
import { loadCategoryGroups } from "../lib/category-utils.js";

const difficulties = ["EASY", "MEDIUM", "HARD", "RANDOM"] as const;
const genres = ["ROCK", "RAP", "POP", "OTHER", "RANDOM"] as const;
const countries = ["LOCAL", "INTERNATIONAL", "RANDOM"] as const;
const releaseYears = ["PRE2000", "2000TO2015", "POST2015", "RANDOM"] as const;

type Variant = {
  difficulty: (typeof difficulties)[number];
  country: (typeof countries)[number];
  releaseYear: (typeof releaseYears)[number];
  genre: (typeof genres)[number];
};

function generateAllVariants(): Variant[] {
  const variants: Variant[] = [];

  for (const difficulty of difficulties) {
    for (const country of countries) {
      for (const releaseYear of releaseYears) {
        for (const genre of genres) {
          variants.push({
            difficulty,
            country,
            releaseYear,
            genre,
          });
        }
      }
    }
  }

  return variants;
}

function countRandoms(variant: Variant): number {
  return Object.values(variant).filter((v) => v === "RANDOM").length;
}

function getVariantKey(variant: Variant): string {
  return `${variant.difficulty}-${variant.genre}-${variant.country}-${variant.releaseYear}`;
}

async function getOtherCategoryIds(
  categoryGroups: ReturnType<typeof loadCategoryGroups>
): Promise<string[]> {
  // If OTHER is explicitly set, use that
  if (categoryGroups.OTHER.length > 0) {
    return categoryGroups.OTHER;
  }

  // Otherwise, calculate OTHER as all categories not in POP, RAP, or ROCK
  const allCategories = await prisma.category.findMany();
  const knownCategoryIds = [
    ...categoryGroups.POP,
    ...categoryGroups.RAP,
    ...categoryGroups.ROCK,
  ];
  return allCategories
    .filter((cat) => !knownCategoryIds.includes(cat.id))
    .map((cat) => cat.id);
}

function buildWhereClause(
  variant: Variant,
  otherCategoryIds: string[],
  categoryGroups: ReturnType<typeof loadCategoryGroups>
) {
  const where: any = {};

  // Handle country
  if (variant.country !== "RANDOM") {
    where.countryOrigin =
      variant.country === "LOCAL" ? "polish" : "international";
  }

  // Handle release year
  if (variant.releaseYear !== "RANDOM") {
    if (variant.releaseYear === "PRE2000") {
      where.releaseYear = { lt: 2000 };
    } else if (variant.releaseYear === "2000TO2015") {
      where.releaseYear = { gte: 2000, lte: 2015 };
    } else if (variant.releaseYear === "POST2015") {
      where.releaseYear = { gt: 2015 };
    }
  }

  // Handle difficulty
  if (variant.difficulty !== "RANDOM") {
    if (variant.difficulty === "EASY") {
      where.difficulty = { gte: 1, lte: 3 };
    } else if (variant.difficulty === "MEDIUM") {
      where.difficulty = { gte: 2, lte: 4 };
    } else if (variant.difficulty === "HARD") {
      where.difficulty = { gte: 3, lte: 5 };
    }
  }

  return where;
}

// Build where clause with actual category IDs for counting songs
function buildWhereClauseForCount(
  variant: Variant,
  otherCategoryIds: string[],
  categoryGroups: ReturnType<typeof loadCategoryGroups>
) {
  const where: any = {};

  // Handle genre (category) with actual IDs for counting
  if (variant.genre !== "RANDOM") {
    if (variant.genre === "OTHER") {
      where.categoryId = { in: otherCategoryIds };
    } else {
      where.categoryId = { in: categoryGroups[variant.genre] };
    }
  }

  // Handle country
  if (variant.country !== "RANDOM") {
    where.countryOrigin =
      variant.country === "LOCAL" ? "polish" : "international";
  }

  // Handle release year
  if (variant.releaseYear !== "RANDOM") {
    if (variant.releaseYear === "PRE2000") {
      where.releaseYear = { lt: 2000 };
    } else if (variant.releaseYear === "2000TO2015") {
      where.releaseYear = { gte: 2000, lte: 2015 };
    } else if (variant.releaseYear === "POST2015") {
      where.releaseYear = { gt: 2015 };
    }
  }

  // Handle difficulty
  if (variant.difficulty !== "RANDOM") {
    if (variant.difficulty === "EASY") {
      where.difficulty = { gte: 1, lte: 3 };
    } else if (variant.difficulty === "MEDIUM") {
      where.difficulty = { gte: 2, lte: 4 };
    } else if (variant.difficulty === "HARD") {
      where.difficulty = { gte: 3, lte: 5 };
    }
  }

  return where;
}

type BlockVariantResult = {
  query: any;
  categoryRef: string | null;
  songsAmount: number;
  ordinalNumber: number;
};

async function generateSingleRandomVariants() {
  try {
    console.log("🚀 Generating single RANDOM variants (exactly 1 RANDOM)...\n");

    const categoryGroups = loadCategoryGroups();
    const allVariants = generateAllVariants();
    const variants = allVariants.filter((v) => countRandoms(v) === 1);
    const otherCategoryIds = await getOtherCategoryIds(categoryGroups);

    console.log(`📊 Total variants to process: ${variants.length}`);
    console.log(`🎵 OTHER category IDs: ${otherCategoryIds.length}\n`);

    const results: Record<string, BlockVariantResult> = {};

    let processed = 0;

    for (const variant of variants) {
      const key = getVariantKey(variant);
      const where = buildWhereClause(variant, otherCategoryIds, categoryGroups);
      const whereForCount = buildWhereClauseForCount(
        variant,
        otherCategoryIds,
        categoryGroups
      );
      const songsAmount = await prisma.song.count({ where: whereForCount });

      results[key] = {
        query: where,
        categoryRef: variant.genre !== "RANDOM" ? variant.genre : null,
        songsAmount,
        ordinalNumber: 0,
      };

      processed++;
      if (processed % 20 === 0) {
        console.log(`✅ Processed ${processed}/${variants.length} variants...`);
      }
    }

    console.log(`\n✨ All ${variants.length} variants processed!\n`);

    // Sort by songsAmount and assign ordinal numbers
    const sortedResults: Record<string, BlockVariantResult> = {};
    const sortedEntries = Object.entries(results).sort(
      (a, b) => b[1].songsAmount - a[1].songsAmount
    );

    let ordinalNumber = 1;
    for (const [key, value] of sortedEntries) {
      sortedResults[key] = {
        ...value,
        ordinalNumber: ordinalNumber++,
      };
    }

    // Save to JSON file
    const outputPath = path.join(
      process.cwd(),
      "generated",
      "single-random-variants.json"
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(
      outputPath,
      JSON.stringify(sortedResults, null, 2),
      "utf-8"
    );

    console.log(`📁 Single RANDOM variants saved to: ${outputPath}`);

    // Display statistics
    console.log("\n" + "=".repeat(60));
    console.log("📈 STATISTICS:");
    console.log("=".repeat(60));

    const totalSongs = Object.values(sortedResults).reduce(
      (sum, r) => sum + r.songsAmount,
      0
    );
    const avgSongsPerVariant = (
      totalSongs / Object.keys(sortedResults).length
    ).toFixed(2);

    console.log(
      `  Total variants included: ${Object.keys(sortedResults).length}`
    );
    console.log(`  Average songs per variant: ${avgSongsPerVariant}`);

    if (sortedEntries.length > 0) {
      const mostSongs = sortedEntries[0]!;
      const leastSongs = sortedEntries[sortedEntries.length - 1]!;

      console.log(
        `  Most songs: ${mostSongs[0]} (${mostSongs[1].songsAmount} songs)`
      );
      console.log(
        `  Least songs: ${leastSongs[0]} (${leastSongs[1].songsAmount} songs)`
      );
    }

    console.log("\n" + "=".repeat(60) + "\n");
    console.log("✅ Generation complete!\n");

    return sortedResults;
  } catch (error) {
    console.error("❌ Error generating single RANDOM variants:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateSingleRandomVariants();
