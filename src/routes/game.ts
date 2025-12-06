import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import type {
  GetRandomSongRequest,
  RandomSongResponse,
  Category,
  Difficulty,
} from "../types/game.js";

// Map game categories to database category names
const CATEGORY_MAP: Record<Exclude<Category, "ALL" | "LOCAL">, string[]> = {
  RAP: ["rap", "hip-hop", "hip hop"],
  ROCK: ["rock", "metal", "alternative", "punk"],
  POP: ["pop"],
  OTHER: [
    "jazz",
    "country",
    "classical",
    "reggae",
    "blues",
    "folk",
    "electronic",
  ],
};

export async function gameRoutes(fastify: FastifyInstance) {
  // Get random song based on category and difficulty
  fastify.get<{
    Params: { category: Category; difficulty: Difficulty };
    Querystring: GetRandomSongRequest;
  }>(
    "/play/:category/:difficulty",
    async (
      request: FastifyRequest<{
        Params: { category: Category; difficulty: Difficulty };
        Querystring: GetRandomSongRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { category, difficulty } = request.params;
        const { excludeSongIds = [], localization = "polish" } = request.query;

        // Validate category
        const validCategories: Category[] = [
          "POP",
          "RAP",
          "ROCK",
          "LOCAL",
          "OTHER",
          "ALL",
        ];
        if (!validCategories.includes(category)) {
          return reply.code(400).send({
            error: `Invalid category. Must be one of: ${validCategories.join(
              ", "
            )}`,
          });
        }

        // Validate difficulty
        if (difficulty !== "EASY" && difficulty !== "HARD") {
          return reply.code(400).send({
            error: 'Invalid difficulty. Must be "EASY" or "HARD"',
          });
        }

        // Build category filter
        let categoryFilter = {};
        if (category === "LOCAL") {
          // For LOCAL category, filter by countryOrigin instead of category name
          categoryFilter = {
            countryOrigin: {
              equals: localization,
              mode: "insensitive" as const,
            },
          };
        } else if (category !== "ALL") {
          const categoryNames = CATEGORY_MAP[category];
          categoryFilter = {
            categories: {
              some: {
                category: {
                  name: {
                    in: categoryNames,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          };
        }

        // Build difficulty filter
        // EASY: Song difficulty NOT HARD (EASY or NORMAL)
        // HARD: Song difficulty NOT EASY (NORMAL or HARD)
        const difficultyFilter =
          difficulty === "EASY"
            ? { difficulty: { not: "HARD" as const } }
            : { difficulty: { not: "EASY" as const } };

        // Find eligible songs
        const eligibleSongs = await prisma.song.findMany({
          where: {
            AND: [
              categoryFilter,
              difficultyFilter,
              {
                id: {
                  notIn: excludeSongIds,
                },
              },
            ],
          },
          include: {
            categories: {
              include: {
                category: true,
              },
            },
          },
        });

        if (eligibleSongs.length === 0) {
          return reply.code(404).send({
            error: "No available songs found for this category and difficulty",
            suggestion: "Try a different category or reset the game",
          });
        }

        // Select random song
        const randomSong =
          eligibleSongs[Math.floor(Math.random() * eligibleSongs.length)];

        if (!randomSong) {
          return reply
            .code(500)
            .send({ error: "Failed to select random song" });
        }

        // Calculate clip timing based on difficulty
        const songDuration = randomSong.duration || 180; // default 3 minutes if not set
        let clipDuration: number;
        let clipStartTime: number;

        if (difficulty === "EASY") {
          clipDuration = 30; // 30 seconds from the start
          clipStartTime = 0; // Always start from beginning for EASY
        } else {
          // HARD: 8-10 seconds from random position within first 2/3 of song
          clipDuration = 8 + Math.floor(Math.random() * 3); // 8-10 seconds
          const maxStartTime =
            Math.floor((songDuration * 2) / 3) - clipDuration; // Within first 2/3
          const minStartTime = 0;
          clipStartTime =
            minStartTime +
            Math.floor(
              Math.random() * Math.max(1, maxStartTime - minStartTime)
            );
        }

        const response: RandomSongResponse = {
          id: randomSong.id,
          title: randomSong.title,
          artists: randomSong.artists,
          youtubeId: randomSong.youtubeId,
          clipDuration,
          clipStartTime,
          releaseYear: randomSong.releaseYear,
        };

        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to get random song" });
      }
    }
  );

  // Reveal song answer (after guessing)
  fastify.get<{ Params: { songId: string } }>(
    "/songs/:songId/reveal",
    async (
      request: FastifyRequest<{ Params: { songId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { songId } = request.params;

        const song = await prisma.song.findUnique({
          where: { id: songId },
          select: {
            id: true,
            title: true,
            artists: true,
            releaseYear: true,
            youtubeId: true,
          },
        });

        if (!song) {
          return reply.code(404).send({ error: "Song not found" });
        }

        return reply.send(song);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to reveal song" });
      }
    }
  );
}
