export interface GetRandomSongRequest {
  config?: {
    locale: string; // TODO: use this value to localize song selection for different regions
  };
}

export interface RandomSongResponse {
  id: string;
  title: string;
  artists: string[];
  youtubeId: string;
  clipDuration: number; // in seconds
  clipStartTime: number; // offset in seconds from start
  releaseYear: number;
}

export type Difficulty =
  | "VERYEASY"
  | "EASY"
  | "MEDIUM"
  | "HARD"
  | "VERYHARD"
  | "RANDOM";
export type SongDifficulty = Exclude<Difficulty, "RANDOM">;
