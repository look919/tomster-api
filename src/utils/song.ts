import type { Difficulty, SongDifficulty } from "../types/game.js";

export const generateSongClipDuration = (difficulty: Difficulty) => {
  let clipDuration: number;
  let limitedDifficulty: SongDifficulty =
    difficulty === "RANDOM" ? "MEDIUM" : difficulty;
  // If difficulty is RANDOM, pick a random difficulty
  if (difficulty === "RANDOM") {
    const difficulties: SongDifficulty[] = ["EASY", "MEDIUM", "HARD"];
    const randomDifficulty = difficulties[Math.floor(Math.random() * 3)]!;
    limitedDifficulty = randomDifficulty;
  }

  // Randomize clip duration based on difficulty
  if (limitedDifficulty === "HARD") {
    clipDuration = 10;
  } else if (limitedDifficulty === "MEDIUM") {
    clipDuration = 20;
  } else {
    clipDuration = 40;
  }

  return clipDuration;
};
