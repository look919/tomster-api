import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { GetRandomSongRequest } from "../types/game.js";
import * as gameController from "../controllers/game.js";

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

        // Validate blockVariantKey format: 3 segments separated by dashes
        // Format: DIFFICULTY-GENRE-LOCALIZATION (e.g., EASY-POP-LOCAL, RANDOM-RANDOM-RANDOM)
        const blockVariantKeyRegex = /^[A-Z]+-[A-Z]+-[A-Z]+$/;
        if (!blockVariantKeyRegex.test(blockVariantKey)) {
          return reply.code(400).send({
            error: `Invalid block variant key format. Expected 3 segments (e.g., EASY-POP-LOCAL)`,
          });
        }

        const blockVariant = gameController.getBlockVariant(blockVariantKey);

        if (!blockVariant) {
          return reply.code(400).send({
            error: `Invalid criteria to look for a song`,
          });
        }

        const response = await gameController.getRandomSong(
          blockVariantKey,
          blockVariant,
          reply
        );

        if (response) {
          return reply.send(response);
        }
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to get random song" });
      }
    }
  );

  // Report song issue - create a new report
  fastify.post<{
    Params: { songId: string };
    Body: {
      category: "WRONG_SONG_DATA" | "SONG_ISSUE" | "OTHER";
      message?: string;
    };
  }>(
    "/songs/:songId/report",
    async (
      request: FastifyRequest<{
        Params: { songId: string };
        Body: {
          category: "WRONG_SONG_DATA" | "SONG_ISSUE" | "OTHER";
          message?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { songId } = request.params;
        const { category, message } = request.body;

        if (!category) {
          return reply.code(400).send({ error: "Category is required" });
        }

        const validCategories = ["WRONG_SONG_DATA", "SONG_ISSUE", "OTHER"];
        if (!validCategories.includes(category)) {
          return reply.code(400).send({ error: "Invalid category" });
        }

        const result = await gameController.reportSong(
          songId,
          category,
          message
        );
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to report song" });
      }
    }
  );
}
