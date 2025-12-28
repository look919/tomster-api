export interface GetRandomSongRequest {
  config?: {
    locale: string;
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
  songsAmount: number; // total songs available for this block variant
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "RANDOM";
export type SongDifficulty = Exclude<Difficulty, "RANDOM">;
