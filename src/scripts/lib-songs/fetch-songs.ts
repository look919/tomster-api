#!/usr/bin/env node
import { Command } from "commander";
import { searchByCategory } from "../../lib/youtube-music.js";

const program = new Command();

program
  .name("fetch-songs")
  .description("Fetch songs from YouTube Music by category and save to JSON")
  .version("1.0.0");

program
  .command("category")
  .description("Fetch songs by category")
  .requiredOption(
    "-c, --category <category>",
    "Category: rock, rap, pop, other, or local"
  )
  .option("-l, --limit <number>", "Number of songs to fetch", "500")
  .option("-t, --time <range>", "Year range (e.g., 2020-2025 or 2015-2020)")
  .option("--no-save", "Don't save to JSON file")
  .action(async (options) => {
    try {
      const limit = parseInt(options.limit, 10);
      const saveToFile = options.save !== false;

      // Parse year range if provided
      let yearRange: { start: number; end: number } | undefined;
      if (options.time) {
        const parts = options.time.split("-");
        if (parts.length === 2) {
          yearRange = {
            start: parseInt(parts[0], 10),
            end: parseInt(parts[1], 10),
          };
          if (isNaN(yearRange.start) || isNaN(yearRange.end)) {
            console.error(
              "❌ Invalid year range format. Use: YYYY-YYYY (e.g., 2020-2025)"
            );
            process.exit(1);
          }
        } else {
          console.error(
            "❌ Invalid year range format. Use: YYYY-YYYY (e.g., 2020-2025)"
          );
          process.exit(1);
        }
      }

      const yearInfo = yearRange
        ? ` from ${yearRange.start}-${yearRange.end}`
        : "";
      console.log(
        `\n🎵 Fetching ${limit} songs from category: ${options.category}${yearInfo}\n`
      );

      const songs = await searchByCategory(
        options.category,
        limit,
        saveToFile,
        yearRange
      );

      console.log(`\n✅ Successfully fetched ${songs.length} songs!`);

      if (saveToFile) {
        const yearSuffix = yearRange
          ? `-${yearRange.start}-${yearRange.end}`
          : "";
        console.log(
          `📁 Results saved to data/${options.category}-songs${yearSuffix}-*.json\n`
        );
      }
    } catch (error) {
      console.error("❌ Error:", error);
      process.exit(1);
    }
  });

program
  .command("all")
  .description("Fetch songs for all categories")
  .option("-l, --limit <number>", "Number of songs per category", "500")
  .action(async (options) => {
    const categories = ["rock", "rap", "pop", "other", "local"];
    const limit = parseInt(options.limit, 10);

    console.log(`\n🎵 Fetching ${limit} songs for each category...\n`);

    for (const category of categories) {
      try {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`📂 Category: ${category.toUpperCase()}`);
        console.log(`${"=".repeat(60)}\n`);

        const songs = await searchByCategory(category, limit, true);

        console.log(`✅ Fetched ${songs.length} ${category} songs`);
      } catch (error) {
        console.error(`❌ Failed to fetch ${category} songs:`, error);
      }
    }

    console.log(`\n\n🎉 All categories processed!\n`);
  });

program.parse();
