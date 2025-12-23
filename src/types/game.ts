export interface GetRandomSongRequest {
  // Currently empty, but kept for future query parameters
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
