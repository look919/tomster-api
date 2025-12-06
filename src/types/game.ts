export type Category = "POP" | "RAP" | "ROCK" | "LOCAL" | "OTHER" | "ALL";

export type Difficulty = "EASY" | "HARD";

export interface GetRandomSongRequest {
  excludeSongIds?: string[];
  localization?: string; // Default: "polish"
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
