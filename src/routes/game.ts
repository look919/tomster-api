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

  // Report song issue - increment reportAmount
  fastify.post<{ Params: { songId: string } }>(
    "/songs/:songId/report",
    async (
      request: FastifyRequest<{ Params: { songId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { songId } = request.params;
        const result = await gameController.reportSong(songId);
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to report song" });
      }
    }
  );
}
