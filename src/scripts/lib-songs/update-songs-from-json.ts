import { prisma } from "../../lib/prisma.js";
import foundData from "../../../data/found-skip-0.json" with { type: "json" };
import notFoundData from "../../../data/not-found-skip-0.json" with { type: "json" };

interface SongData {
  artists: string[];
  releaseDate: number;
  primaryGenreType: string;
  itunesTrackName?: string;
  itunesArtistName?: string;
  originalTitle: string;
  originalArtist: string;
}

interface JsonData {
  [id: string]: SongData;
}

// Update songs in the database based on JSON data got from iTunes API
async function updateSongsFromJson() {
  try {
    // ========================================
    // CONFIGURE FILES TO IMPORT HERE
    // ========================================
    // Change the import paths at the top of the file to import different JSON files
    // ========================================

    const foundSongs: JsonData = foundData as JsonData;
    const notFoundSongs: JsonData = notFoundData as JsonData;

    // Combine both datasets
    const allSongsData = { ...foundSongs, ...notFoundSongs };
    const songIds = Object.keys(allSongsData);

    console.log(`📊 Total songs in JSON files: ${songIds.length}`);
    console.log(`   Found: ${Object.keys(foundSongs).length}`);
    console.log(`   Not Found: ${Object.keys(notFoundSongs).length}`);
    console.log();

    let updated = 0;
    let skipped = 0;
    let categoriesCreated = 0;
    const categoriesCache = new Map<string, string>(); // name -> id

    // Fetch existing categories
    const existingCategories = await prisma.category.findMany();
    existingCategories.forEach((cat) => {
      categoriesCache.set(cat.name, cat.id);
    });

    console.log(`📋 Found ${existingCategories.length} existing categories\n`);
    console.log(`🔄 Processing songs...\n`);

    for (const [songId, songData] of Object.entries(allSongsData)) {
      try {
        // Check if song exists in database
        const existingSong = await prisma.song.findUnique({
          where: { id: songId },
          include: {
            category: true,
          },
        });

        if (!existingSong) {
          console.log(`⏭️  Skipped: Song ${songId} not found in database`);
          skipped++;
          continue;
        }

        // Get or create category
        const categoryName = songData.primaryGenreType.toLowerCase();
        let categoryId = categoriesCache.get(categoryName);

        if (!categoryId) {
          // Create new category
          const newCategory = await prisma.category.create({
            data: {
              name: categoryName,
            },
          });
          categoryId = newCategory.id;
          categoriesCache.set(categoryName, categoryId);
          categoriesCreated++;
          console.log(`   ✨ Created category: ${songData.primaryGenreType}`);
        }

        // Update song with category
        await prisma.song.update({
          where: { id: songId },
          data: {
            title: songData.originalTitle,
            artist: songData.originalArtist,
            artists: songData.artists,
            releaseYear: songData.releaseDate,
            categoryId: categoryId,
            updatedAt: new Date(),
          },
        });

        updated++;
        console.log(
          `✅ Updated: "${existingSong.title}" → "${songData.originalTitle}" (${songData.primaryGenreType})`
        );
      } catch (error) {
        console.error(`❌ Error updating song ${songId}:`, error);
        skipped++;
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎉 Update complete!`);
    console.log(`${"=".repeat(60)}`);
    console.log(`✅ Updated: ${updated} songs`);
    console.log(`⏭️  Skipped: ${skipped} songs (not found or errors)`);
    console.log(`✨ Categories created: ${categoriesCreated}`);
    console.log(`📊 Total in files: ${songIds.length}`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateSongsFromJson();
