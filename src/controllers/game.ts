import type { FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import type { Difficulty, RandomSongResponse } from "../types/game.js";
import { parseCategoryIds } from "../lib/category-utils.js";
import { generateSongClipDuration } from "../utils/song.js";
import allPossibleBlockVariants from "../../generated/all-possible-block-variants.json" with { type: "json" };

interface BlockVariant {
  query: any;
  categoryRef: string | null;
  songsAmount: number;
  ordinalNumber: number;
}

type BlockVariantsMap = Record<string, BlockVariant>;

const blockVariants: BlockVariantsMap = allPossibleBlockVariants;

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

// Convert Prisma where clause to SQL WHERE conditions
function buildSqlWhereClause(query: any): { sql: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(query)) {
    if (key === "categoryId" && value && typeof value === "object") {
      const inValue = (value as any).in;
      if (Array.isArray(inValue) && inValue.length > 0) {
        conditions.push(`s."categoryId" = ANY($${paramIndex})`);
        params.push(inValue);
        paramIndex++;
      }
    } else if (key === "difficulty" && value && typeof value === "object") {
      const gteValue = (value as any).gte;
      const lteValue = (value as any).lte;
      if (gteValue !== undefined) {
        conditions.push(`s."difficulty" >= $${paramIndex}`);
        params.push(gteValue);
        paramIndex++;
      }
      if (lteValue !== undefined) {
        conditions.push(`s."difficulty" <= $${paramIndex}`);
        params.push(lteValue);
        paramIndex++;
      }
    } else if (key === "releaseYear" && value && typeof value === "object") {
      const gteValue = (value as any).gte;
      const lteValue = (value as any).lte;
      const gtValue = (value as any).gt;
      const ltValue = (value as any).lt;
      if (gteValue !== undefined) {
        conditions.push(`s."releaseYear" >= $${paramIndex}`);
        params.push(gteValue);
        paramIndex++;
      }
      if (lteValue !== undefined) {
        conditions.push(`s."releaseYear" <= $${paramIndex}`);
        params.push(lteValue);
        paramIndex++;
      }
      if (gtValue !== undefined) {
        conditions.push(`s."releaseYear" > $${paramIndex}`);
        params.push(gtValue);
        paramIndex++;
      }
      if (ltValue !== undefined) {
        conditions.push(`s."releaseYear" < $${paramIndex}`);
        params.push(ltValue);
        paramIndex++;
      }
    } else if (key === "countryOrigin") {
      conditions.push(`s."countryOrigin" = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
}

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

// Get block variant by key
export function getBlockVariant(blockVariantKey: string): BlockVariant | null {
  return blockVariants[blockVariantKey] || null;
}

export async function getRandomSong(
  blockVariantKey: string,
  blockVariant: BlockVariant,
  reply: FastifyReply
): Promise<RandomSongResponse | void> {
  try {
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

    // Build SQL WHERE clause from Prisma query
    const { sql: whereClause, params } = buildSqlWhereClause(finalQuery);

    // Build the complete SQL query
    const sqlQuery = `
      SELECT 
        s.id,
        s.title,
        s.artists,
        s."youtubeId",
        s.duration,
        s."releaseYear",
        s."categoryId",
        c.name as "categoryName"
      FROM "Song" s
      LEFT JOIN "Category" c ON s."categoryId" = c.id
      ${whereClause}
      ORDER BY RANDOM()
      LIMIT 1
    `;

    // Fetch one random song using database-native random ordering
    const randomSongs = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        artists: string[];
        youtubeId: string;
        duration: number;
        releaseYear: number;
        categoryId: string;
        categoryName: string;
      }>
    >(sqlQuery, ...params);

    const randomSong = randomSongs[0];

    if (!randomSong) {
      return reply.code(500).send({ error: "Failed to get random song" });
    }

    // Calculate clip timing
    const songDuration = randomSong.duration;

    // Extract difficulty from block variant key
    const difficulty = blockVariantKey.split("-")[0] as Difficulty;
    const clipDuration = generateSongClipDuration(difficulty);

    // Calculate remaining time after subtracting clip duration
    const remainingTime = songDuration - clipDuration;

    // Pick random start time within 80% of the remaining time
    const maxStartTime = Math.floor(remainingTime * 0.8);
    let clipStartTime = Math.floor(Math.random() * Math.max(1, maxStartTime));
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

    return response;
  } catch (error) {
    console.error("Error getting random song:", error);
    throw error;
  }
}

export async function reportSong(
  songId: string,
  category: "WRONG_SONG_DATA" | "SONG_ISSUE" | "OTHER",
  message?: string
) {
  const report = await prisma.report.create({
    data: {
      songId,
      category,
      message: message ?? "",
    },
    select: {
      id: true,
      songId: true,
      category: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    reportId: report.id,
    songId: report.songId,
    category: report.category,
  };
}
