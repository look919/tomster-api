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

// Custom block variants with their blocksAmount
const CUSTOM_BLOCK_VARIANTS: Record<string, number> = {
  "RANDOM-RANDOM-RANDOM-RANDOM": 10,
  "HARD-RANDOM-RANDOM-RANDOM": 4,
  "MEDIUM-RANDOM-RANDOM-RANDOM": 4,
  "EASY-RANDOM-RANDOM-RANDOM": 4,
  "RANDOM-ROCK-RANDOM-RANDOM": 3,
  "RANDOM-RAP-RANDOM-RANDOM": 3,
  "RANDOM-POP-RANDOM-RANDOM": 3,
  "RANDOM-OTHER-RANDOM-RANDOM": 3,
  "RANDOM-RANDOM-LOCAL-RANDOM": 4,
  "RANDOM-RANDOM-RANDOM-POST2015": 2,
  "RANDOM-RANDOM-RANDOM-2000TO2015": 2,
  "RANDOM-RANDOM-RANDOM-PRE2000": 2,
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

function parseVariantKey(key: string): Variant | null {
  const parts = key.split("-");
  if (parts.length < 4) return null;

  const [difficulty, genre, country, releaseYear] = parts;

  if (
    !difficulties.includes(difficulty as any) ||
    !genres.includes(genre as any) ||
    !countries.includes(country as any)
  ) {
    return null;
  }

  return {
    difficulty: difficulty as (typeof difficulties)[number],
    genre: genre as (typeof genres)[number],
    country: country as (typeof countries)[number],
    releaseYear: releaseYear as (typeof releaseYears)[number],
  };
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

  // Note: Genre (category) is now stored separately as categoryRef outside the query

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
  blocksAmount: number;
};

async function generateBlockVariants() {
  try {
    console.log("🚀 Generating block variants (exactly 2 RANDOMs)...\n");

    const categoryGroups = loadCategoryGroups();
    const allVariants = generateAllVariants();
    const variants = allVariants.filter((v) => countRandoms(v) === 2);
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
        blocksAmount: 2,
      };

      processed++;
      if (processed % 50 === 0) {
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
      "block-variants.json"
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(
      outputPath,
      JSON.stringify(sortedResults, null, 2),
      "utf-8"
    );

    console.log(`📁 Block variants saved to: ${outputPath}`);

    return results;
  } catch (error) {
    console.error("❌ Error generating block variants:", error);
    throw error;
  }
}

async function generateAdditionalBlockVariants() {
  try {
    console.log(
      "\n🔧 Generating additional block variants (all other variants)...\n"
    );

    const categoryGroups = loadCategoryGroups();
    const allVariants = generateAllVariants();
    const variants = allVariants.filter((v) => countRandoms(v) !== 2);
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
        blocksAmount: 1,
      };

      processed++;
      if (processed % 100 === 0) {
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
      "additional-block-variants.json"
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(
      outputPath,
      JSON.stringify(sortedResults, null, 2),
      "utf-8"
    );

    console.log(`📁 Additional block variants saved to: ${outputPath}`);

    return results;
  } catch (error) {
    console.error("❌ Error generating additional block variants:", error);
    throw error;
  }
}

async function generateCustomBlockVariants() {
  try {
    console.log("\n🎨 Generating custom block variants...\n");

    const categoryGroups = loadCategoryGroups();
    const otherCategoryIds = await getOtherCategoryIds(categoryGroups);
    const customResults: Record<string, BlockVariantResult> = {};

    let processed = 0;
    const totalCustom = Object.keys(CUSTOM_BLOCK_VARIANTS).length;

    for (const [key, blocksAmount] of Object.entries(CUSTOM_BLOCK_VARIANTS)) {
      const variant = parseVariantKey(key);

      if (!variant) {
        console.warn(`⚠️  Invalid variant key: ${key}, skipping...`);
        continue;
      }

      const where = buildWhereClause(variant, otherCategoryIds, categoryGroups);
      const whereForCount = buildWhereClauseForCount(
        variant,
        otherCategoryIds,
        categoryGroups
      );
      const songsAmount = await prisma.song.count({ where: whereForCount });

      customResults[key] = {
        query: where,
        categoryRef: variant.genre !== "RANDOM" ? variant.genre : null,
        songsAmount,
        ordinalNumber: 0,
        blocksAmount,
      };

      processed++;
      console.log(
        `✅ Processed ${processed}/${totalCustom}: ${key} (${blocksAmount} blocks)`
      );
    }

    // Sort by songsAmount and assign ordinal numbers
    const sortedResults: Record<string, BlockVariantResult> = {};
    const sortedEntries = Object.entries(customResults).sort(
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
      "custom-block-variants.json"
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(
      outputPath,
      JSON.stringify(sortedResults, null, 2),
      "utf-8"
    );

    console.log(`📁 Custom block variants saved to: ${outputPath}`);

    return customResults;
  } catch (error) {
    console.error("❌ Error generating custom block variants:", error);
    throw error;
  }
}

async function generateBlockData() {
  try {
    console.log("🚀 Starting block variant generation...\n");

    // Generate all three files
    const blockResults = await generateBlockVariants();
    const additionalResults = await generateAdditionalBlockVariants();
    const customResults = await generateCustomBlockVariants();

    // Display statistics
    console.log("\n" + "=".repeat(80));
    console.log("📈 STATISTICS:");
    console.log("=".repeat(80));

    const displayStats = (
      results: Record<string, BlockVariantResult>,
      name: string
    ) => {
      const variantsWithSongs = Object.values(results).filter(
        (r) => r.songsAmount > 0
      ).length;
      const variantsWithoutSongs = Object.values(results).filter(
        (r) => r.songsAmount === 0
      ).length;
      const totalSongs = Object.values(results).reduce(
        (sum, r) => sum + r.songsAmount,
        0
      );
      const avgSongsPerVariant = (
        totalSongs / Object.keys(results).length
      ).toFixed(2);

      console.log(`\n${name}:`);
      console.log(`  Total variants: ${Object.keys(results).length}`);
      console.log(`  Variants with songs: ${variantsWithSongs}`);
      console.log(`  Variants without songs: ${variantsWithoutSongs}`);
      console.log(`  Average songs per variant: ${avgSongsPerVariant}`);

      const sortedByAmount = Object.entries(results)
        .filter(([_, v]) => v.songsAmount > 0)
        .sort((a, b) => b[1].songsAmount - a[1].songsAmount);

      if (sortedByAmount.length > 0) {
        const mostSongs = sortedByAmount[0]!;
        const leastSongs = sortedByAmount[sortedByAmount.length - 1]!;

        console.log(
          `  Most songs: ${mostSongs[0]} (${mostSongs[1].songsAmount} songs)`
        );
        console.log(
          `  Least songs: ${leastSongs[0]} (${leastSongs[1].songsAmount} songs)`
        );
      }
    };

    displayStats(blockResults, "Block Variants (2 RANDOMs)");
    displayStats(
      additionalResults,
      "Additional Block Variants (0, 1, 3, or 4 RANDOMs)"
    );
    displayStats(customResults, "Custom Block Variants");

    console.log("\n" + "=".repeat(80) + "\n");
    console.log("✅ All files generated successfully!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateBlockData();
