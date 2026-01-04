import type { Difficulty, SongDifficulty } from "../types/game.js";

const CLIP_DURATION_BY_DIFFICULTY: Record<
  SongDifficulty,
  number | { min: number; max: number }
> = {
  VERYEASY: 60,
  EASY: 45,
  MEDIUM: 30,
  HARD: 15,
  VERYHARD: { min: 6, max: 12 },
};

const SONG_DIFFICULTIES: SongDifficulty[] = [
  "VERYEASY",
  "EASY",
  "MEDIUM",
  "HARD",
  "VERYHARD",
];

export const generateSongClipDuration = (difficulty: Difficulty): number => {
  const effectiveDifficulty: SongDifficulty =
    difficulty === "RANDOM"
      ? SONG_DIFFICULTIES[Math.floor(Math.random() * SONG_DIFFICULTIES.length)]!
      : difficulty;

  const duration = CLIP_DURATION_BY_DIFFICULTY[effectiveDifficulty];

  if (typeof duration === "object") {
    // Random duration between min and max for VERYHARD
    return (
      Math.floor(Math.random() * (duration.max - duration.min + 1)) +
      duration.min
    );
  }

  return duration;
};

// VERYEASY has 50% chance to start from the beginning
export const shouldStartFromBeginning = (difficulty: Difficulty): boolean => {
  return difficulty === "VERYEASY" && Math.random() < 0.5;
};
