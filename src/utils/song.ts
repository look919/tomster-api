import type { Difficulty, SongDifficulty } from "../types/game.js";

const CLIP_DURATION_BY_DIFFICULTY: Record<
  SongDifficulty,
  { min: number; max: number }
> = {
  VERYEASY: { min: 50, max: 70 },
  EASY: { min: 35, max: 55 },
  MEDIUM: { min: 30, max: 30 },
  HARD: { min: 15, max: 25 },
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

  return (
    Math.floor(Math.random() * (duration.max - duration.min + 1)) + duration.min
  );
};
