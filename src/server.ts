import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "./lib/prisma.js";
import { gameRoutes } from "./routes/game.js";

const fastify = Fastify({
  logger: true,
});

// Register CORS for web/mobile app support
await fastify.register(cors, {
  origin: true, // Allow all origins in development, configure for production
  credentials: true,
});

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? (error.statusCode as number)
      : 500;

  const message =
    error instanceof Error ? error.message : "Internal Server Error";

  reply.status(statusCode).send({
    error: message,
    statusCode,
  });
});

// Health check route
fastify.get("/", function (request, reply) {
  reply.send({
    status: "ok",
    message: "Tomster Music Game API",
    version: "1.0.0",
  });
});

// Health check with DB
fastify.get("/health", async function (request, reply) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    reply.send({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply.code(503).send({
      status: "unhealthy",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// Register routes
await fastify.register(gameRoutes, { prefix: "/api/game" });

// Graceful shutdown
const shutdown = async () => {
  fastify.log.info("Shutting down gracefully...");
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Run the server!
fastify.listen({ port: 5000, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server is now listening on ${address}`);

  // Log all registered routes
  fastify.log.info("Registered routes:");
  fastify.log.info(fastify.printRoutes());
});
