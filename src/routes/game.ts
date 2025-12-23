import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import type {
  GetRandomSongRequest,
  RandomSongResponse,
} from "../types/game.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseCategoryIds } from "../lib/category-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BlockVariant {
  query: any;
  categoryRef: string | null;
  songsAmount: number;
  ordinalNumber: number;
  blocksAmount: number;
}

type BlockVariantsMap = Record<string, BlockVariant>;

// Build final query by merging categoryRef with where clause
function buildFinalQuery(blockVariant: BlockVariant): any {
  const finalQuery = { ...blockVariant.query };

  // If categoryRef exists, add categoryId to the query
  if (blockVariant.categoryRef) {
    const envMap: Record<string, string | undefined> = {
      POP: process.env.CATEGORY_POP,
      RAP: process.env.CATEGORY_RAP,
      ROCK: process.env.CATEGORY_ROCK,
      OTHER: process.env.CATEGORY_OTHER,
    };

    const categoryIds = parseCategoryIds(envMap[blockVariant.categoryRef]);
    finalQuery.categoryId = { in: categoryIds };
  }

  return finalQuery;
}

// Load block variants from JSON files synchronously at module level
const blockVariantsPath = join(
  __dirname,
  "../../generated/block-variants.json"
);
const additionalBlockVariantsPath = join(
  __dirname,
  "../../generated/additional-block-variants.json"
);

const blockVariants: BlockVariantsMap = JSON.parse(
  readFileSync(blockVariantsPath, "utf-8")
);
const additionalBlockVariants: BlockVariantsMap = JSON.parse(
  readFileSync(additionalBlockVariantsPath, "utf-8")
);

export async function gameRoutes(fastify: FastifyInstance) {
  // Get random song based on block variant key
  fastify.get<{
    Params: { blockVariantKey: string };
    Querystring: GetRandomSongRequest;
  }>(
    "/play/:blockVariantKey",
    async (
      request: FastifyRequest<{
        Params: { blockVariantKey: string };
        Querystring: GetRandomSongRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { blockVariantKey } = request.params;

        // Look for block variant in all three JSON files
        const blockVariant =
          blockVariants[blockVariantKey] ||
          additionalBlockVariants[blockVariantKey];

        if (!blockVariant) {
          return reply.code(400).send({
            error: `Invalid criteria to look for a song`,
          });
        }

        console.log(`Selected block variant: ${JSON.stringify(blockVariant)}`);

        // Use songsAmount from JSON to randomly select one song
        if (blockVariant.songsAmount === 0) {
          return reply.code(404).send({
            error: "No available songs found for this block variant",
            songsAmount: 0,
          });
        }

        // Build final query with category IDs if categoryRef exists
        const finalQuery = buildFinalQuery(blockVariant);
        console.log(`Final query: ${JSON.stringify(finalQuery)}`);

        // Pick a random offset within available songs
        const randomOffset = Math.floor(
          Math.random() * blockVariant.songsAmount
        );

        // Fetch only one random song using skip
        const songs = await prisma.song.findMany({
          where: finalQuery,
          skip: randomOffset,
          take: 1,
          include: {
            category: true,
          },
        });

        const randomSong = songs[0];

        if (!randomSong) {
          return reply.code(500).send({ error: "Failed to get random song" });
        }

        // Calculate clip timing
        const songDuration = randomSong.duration;

        // Extract difficulty from block variant key
        let difficulty = blockVariantKey.split("-")[0]; // e.g., "EASY", "MEDIUM", "HARD", "RANDOM"

        let clipDuration: number;

        if (difficulty === "RANDOM") {
          const difficulties = ["EASY", "MEDIUM", "HARD"];
          const randomDifficulty = difficulties[Math.floor(Math.random() * 3)];
          difficulty = randomDifficulty;
        }

        // Randomize clip duration based on difficulty
        if (difficulty === "HARD") {
          clipDuration = 10;
        } else if (difficulty === "MEDIUM") {
          clipDuration = 20;
        } else {
          clipDuration = 40;
        }

        // Calculate remaining time after subtracting clip duration
        const remainingTime = songDuration - clipDuration;

        // Pick random start time within 3/4 of the remaining time
        const maxStartTime = Math.floor(remainingTime * 0.8);
        let clipStartTime = Math.floor(
          Math.random() * Math.max(1, maxStartTime)
        );
        if (clipStartTime < 10) {
          clipStartTime = 0; // Start from beginning if too close
        }

        const response: RandomSongResponse = {
          id: randomSong.id,
          title: randomSong.title,
          artists: randomSong.artists,
          youtubeId: randomSong.youtubeId,
          clipDuration,
          clipStartTime,
          releaseYear: randomSong.releaseYear,
          songsAmount: blockVariant.songsAmount,
        };

        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to get random song" });
      }
    }
  );

  // Report song issue - increment reportAmount
  fastify.post<{ Params: { songId: string } }>(
    "/songs/:songId/report",
    async (
      request: FastifyRequest<{ Params: { songId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { songId } = request.params;

        const song = await prisma.song.update({
          where: { id: songId },
          data: {
            reportAmount: {
              increment: 1,
            },
          },
          select: {
            id: true,
            reportAmount: true,
          },
        });

        return reply.send({
          success: true,
          songId: song.id,
          reportAmount: song.reportAmount,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to report song" });
      }
    }
  );
}
