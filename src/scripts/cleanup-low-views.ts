#!/usr/bin/env node
import { Command } from "commander";
import { removeLowViewSongs } from "../lib/youtube-music.js";

const program = new Command();

program
  .name("cleanup-low-views")
  .description("Remove songs from database with view count below threshold")
  .option(
    "-m, --min-views <number>",
    "Minimum view count required (default: 10,000,000)",
    "10000000"
  )
  .action(async (options) => {
    const minViews = parseInt(options.minViews, 10);

    if (isNaN(minViews) || minViews < 0) {
      console.error("❌ Invalid minimum views value");
      process.exit(1);
    }

    console.log(`\n🧹 Starting cleanup...`);
    console.log(`🎯 Minimum views required: ${minViews.toLocaleString()}\n`);

    try {
      await removeLowViewSongs(minViews);
    } catch (error) {
      console.error("❌ Cleanup failed:", error);
      process.exit(1);
    }
  });

program.parse();
