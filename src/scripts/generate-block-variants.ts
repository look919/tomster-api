import { prisma } from "../lib/prisma.js";
import fs from "fs/promises";
import path from "path";
import { loadCategoryGroups } from "../lib/category-utils.js";

const difficulties = ["EASY", "MEDIUM", "HARD", "RANDOM"] as const;
const genres = ["ROCK", "RAP", "POP", "OTHER", "RANDOM"] as const;
const countries = ["LOCAL", "INTERNATIONAL", "RANDOM"] as const;

type Variant = {
  difficulty: (typeof difficulties)[number];
  country: (typeof countries)[number];
  genre: (typeof genres)[number];
};

function generateAllVariants(): Variant[] {
  const variants: Variant[] = [];

  for (const difficulty of difficulties) {
    for (const country of countries) {
      for (const genre of genres) {
        variants.push({
          difficulty,
          country,
          genre,
        });
      }
    }
  }

  return variants;
}

function countRandoms(variant: Variant): number {
  return [variant.difficulty, variant.country, variant.genre].filter(
    (v) => v === "RANDOM"
  ).length;
}

function getVariantKey(variant: Variant): string {
  return `${variant.difficulty}-${variant.genre}-${variant.country}`;
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

function buildWhereClause(variant: Variant) {
  const where: any = {};

  // Handle country
  if (variant.country !== "RANDOM") {
    where.countryOrigin =
      variant.country === "LOCAL" ? "polish" : "international";
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
  count: number;
};

async function processVariants(
  variants: Variant[],
  categoryGroups: ReturnType<typeof loadCategoryGroups>,
  otherCategoryIds: string[],
  countFn: (key: string) => number
): Promise<Record<string, BlockVariantResult>> {
  const results: Record<string, BlockVariantResult> = {};

  for (const variant of variants) {
    const key = getVariantKey(variant);
    const where = buildWhereClause(variant);
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
      count: countFn(key),
    };
  }

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

  return sortedResults;
}

async function saveToFile(
  results: Record<string, BlockVariantResult>,
  filename: string
) {
  const outputPath = path.join(process.cwd(), "generated", filename);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`📁 Saved to: ${outputPath}`);
}

async function generateAllPossibleBlockVariants(
  allVariants: Variant[],
  categoryGroups: ReturnType<typeof loadCategoryGroups>,
  otherCategoryIds: string[]
) {
  console.log("\n🔧 Generating all-possible-block-variants.json...");
  const results = await processVariants(
    allVariants,
    categoryGroups,
    otherCategoryIds,
    () => 2 // count = 2 for all
  );
  await saveToFile(results, "all-possible-block-variants.json");
  return results;
}

async function generateMaxOneInfoVariants(
  allVariants: Variant[],
  categoryGroups: ReturnType<typeof loadCategoryGroups>,
  otherCategoryIds: string[]
) {
  console.log("\n🎲 Generating max-one-info-variants.json...");
  // 2 or 3 RANDOMs (max 1 info = at most 1 non-RANDOM field)
  const variants = allVariants.filter((v) => countRandoms(v) >= 2);
  const results = await processVariants(
    variants,
    categoryGroups,
    otherCategoryIds,
    (key) => (key === "RANDOM-RANDOM-RANDOM" ? 14 : 4)
  );
  await saveToFile(results, "max-one-info-variants.json");
  return results;
}

async function generateTwoInfoVariants(
  allVariants: Variant[],
  categoryGroups: ReturnType<typeof loadCategoryGroups>,
  otherCategoryIds: string[]
) {
  console.log("\n📊 Generating two-info-variants.json...");
  // Exactly 1 RANDOM (2 non-RANDOM fields = 2 info)
  const variants = allVariants.filter((v) => countRandoms(v) === 1);
  const results = await processVariants(
    variants,
    categoryGroups,
    otherCategoryIds,
    () => 2 // count = 2 for all
  );
  await saveToFile(results, "two-info-variants.json");
  return results;
}

async function generateThreeInfoVariants(
  allVariants: Variant[],
  categoryGroups: ReturnType<typeof loadCategoryGroups>,
  otherCategoryIds: string[]
) {
  console.log("\n🎯 Generating three-info-variants.json...");
  // 0 RANDOMs (3 non-RANDOM fields = 3 info)
  const variants = allVariants.filter((v) => countRandoms(v) === 0);
  const results = await processVariants(
    variants,
    categoryGroups,
    otherCategoryIds,
    () => 2 // count = 2 for all
  );
  await saveToFile(results, "three-info-variants.json");
  return results;
}

async function generateBlockData() {
  try {
    console.log("🚀 Starting block variant generation...\n");

    const categoryGroups = loadCategoryGroups();
    const allVariants = generateAllVariants();
    const otherCategoryIds = await getOtherCategoryIds(categoryGroups);

    console.log(`📊 Total possible variants: ${allVariants.length}`);
    console.log(`🎵 OTHER category IDs: ${otherCategoryIds.length}`);

    // Generate all four files
    const allPossibleResults = await generateAllPossibleBlockVariants(
      allVariants,
      categoryGroups,
      otherCategoryIds
    );
    const maxOneInfoResults = await generateMaxOneInfoVariants(
      allVariants,
      categoryGroups,
      otherCategoryIds
    );
    const twoInfoResults = await generateTwoInfoVariants(
      allVariants,
      categoryGroups,
      otherCategoryIds
    );
    const threeInfoResults = await generateThreeInfoVariants(
      allVariants,
      categoryGroups,
      otherCategoryIds
    );

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

    displayStats(allPossibleResults, "All Possible Block Variants");
    displayStats(maxOneInfoResults, "Max One Info Variants (2-3 RANDOMs)");
    displayStats(twoInfoResults, "Two Info Variants (1 RANDOM)");
    displayStats(threeInfoResults, "Three Info Variants (0 RANDOMs)");

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
