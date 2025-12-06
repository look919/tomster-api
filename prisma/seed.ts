import { PrismaClient } from "@prisma/client";
import type { Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data
  console.log("Clearing existing data...");
  await prisma.songCategory.deleteMany();
  await prisma.song.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  console.log("Creating categories...");
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "rap" } }),
    prisma.category.create({ data: { name: "hip-hop" } }),
    prisma.category.create({ data: { name: "rock" } }),
    prisma.category.create({ data: { name: "metal" } }),
    prisma.category.create({ data: { name: "pop" } }),
    prisma.category.create({ data: { name: "polish" } }),
    prisma.category.create({ data: { name: "local" } }),
    prisma.category.create({ data: { name: "jazz" } }),
    prisma.category.create({ data: { name: "country" } }),
    prisma.category.create({ data: { name: "classical" } }),
    prisma.category.create({ data: { name: "reggae" } }),
    prisma.category.create({ data: { name: "electronic" } }),
  ]);

  const categoryMap: Record<string, string> = Object.fromEntries(
    categories.map((c: { name: string; id: string }) => [c.name, c.id])
  );

  // Create songs with realistic data
  console.log("Creating songs...");

  // Rap/Hip-Hop Songs (mix of EASY, NORMAL, HARD)
  const rapSongs = [
    {
      title: "Lose Yourself",
      artists: ["Eminem"],
      youtubeId: "_Yhyp-_hX2s",
      duration: 326,
      difficulty: "EASY" as Difficulty,
      releaseYear: 2002,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "HUMBLE.",
      artists: ["Kendrick Lamar"],
      youtubeId: "tvTRZJ-4EyI",
      duration: 177,
      difficulty: "EASY" as Difficulty,
      releaseYear: 2017,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "Nuthin' but a 'G' Thang",
      artists: ["Dr. Dre", "Snoop Dogg"],
      youtubeId: "_qkP8SvHvaU",
      duration: 235,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1992,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "Juicy",
      artists: ["The Notorious B.I.G."],
      youtubeId: "_JZom_gVfuw",
      duration: 298,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1994,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "99 Problems",
      artists: ["Jay-Z"],
      youtubeId: "WwoM5fLITfk",
      duration: 234,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 2003,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "Stan",
      artists: ["Eminem", "Dido"],
      youtubeId: "gOMhN-hfMtY",
      duration: 404,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 2000,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "Gangsta's Paradise",
      artists: ["Coolio"],
      youtubeId: "fPO76Jlntyg",
      duration: 240,
      difficulty: "EASY" as Difficulty,
      releaseYear: 1995,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "The Real Slim Shady",
      artists: ["Eminem"],
      youtubeId: "eJO5HU_7_1w",
      duration: 284,
      difficulty: "EASY" as Difficulty,
      releaseYear: 2000,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "In Da Club",
      artists: ["50 Cent"],
      youtubeId: "5qm8PH4xAss",
      duration: 253,
      difficulty: "EASY" as Difficulty,
      releaseYear: 2003,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
    {
      title: "Still D.R.E.",
      artists: ["Dr. Dre", "Snoop Dogg"],
      youtubeId: "_CL6n0FJZpk",
      duration: 271,
      difficulty: "EASY" as Difficulty,
      releaseYear: 1999,
      countryOrigin: "international",
      categories: [categoryMap["rap"], categoryMap["hip-hop"]],
    },
  ];

  // Rock Songs
  const rockSongs = [
    {
      title: "Bohemian Rhapsody",
      artists: ["Queen"],
      youtubeId: "fJ9rUzIMcZQ",
      duration: 354,
      difficulty: "EASY" as Difficulty,
      releaseYear: 1975,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
    {
      title: "Stairway to Heaven",
      artists: ["Led Zeppelin"],
      youtubeId: "QkF3oxziUI4",
      duration: 482,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1971,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
    {
      title: "Smells Like Teen Spirit",
      artists: ["Nirvana"],
      youtubeId: "hTWKbfoikeg",
      duration: 301,
      difficulty: "EASY" as Difficulty,
      releaseYear: 1991,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
    {
      title: "Sweet Child O' Mine",
      artists: ["Guns N' Roses"],
      youtubeId: "1w7OgIMMRc4",
      duration: 356,
      difficulty: "EASY" as Difficulty,
      releaseYear: 1987,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
    {
      title: "Hotel California",
      artists: ["Eagles"],
      youtubeId: "09839DpTctU",
      duration: 391,
      difficulty: "EASY" as Difficulty,
      releaseYear: 1976,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
    {
      title: "Paint It Black",
      artists: ["The Rolling Stones"],
      youtubeId: "O4irXQhgMqg",
      duration: 222,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1966,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
    {
      title: "Back in Black",
      artists: ["AC/DC"],
      youtubeId: "pAgnJDJN4VA",
      duration: 255,
      difficulty: "EASY" as Difficulty,
      releaseYear: 1980,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
    {
      title: "Enter Sandman",
      artists: ["Metallica"],
      youtubeId: "CD-E-LDc384",
      duration: 331,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1991,
      countryOrigin: "international",
      categories: [categoryMap["rock"], categoryMap["metal"]],
    },
    {
      title: "Come As You Are",
      artists: ["Nirvana"],
      youtubeId: "vabnZ9-ex7o",
      duration: 219,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1991,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
    {
      title: "Under the Bridge",
      artists: ["Red Hot Chili Peppers"],
      youtubeId: "lwlogyj7nFE",
      duration: 264,
      difficulty: "HARD" as Difficulty,
      releaseYear: 1991,
      countryOrigin: "international",
      categories: [categoryMap["rock"]],
    },
  ];

  // Pop Songs
  const popSongs = [
    {
      title: "Billie Jean",
      artists: ["Michael Jackson"],
      youtubeId: "Zi_XLOBDo_Y",
      duration: 294,
      difficulty: "EASY" as Difficulty,
      releaseYear: 1982,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "Shape of You",
      artists: ["Ed Sheeran"],
      youtubeId: "JGwWNGJdvx8",
      duration: 233,
      difficulty: "EASY" as Difficulty,
      releaseYear: 2017,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "Blinding Lights",
      artists: ["The Weeknd"],
      youtubeId: "4NRXx6U8ABQ",
      duration: 200,
      difficulty: "EASY" as Difficulty,
      releaseYear: 2019,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "Rolling in the Deep",
      artists: ["Adele"],
      youtubeId: "rYEDA3JcQqw",
      duration: 228,
      difficulty: "EASY" as Difficulty,
      releaseYear: 2010,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "Uptown Funk",
      artists: ["Mark Ronson", "Bruno Mars"],
      youtubeId: "OPf0YbXqDm0",
      duration: 269,
      difficulty: "EASY" as Difficulty,
      releaseYear: 2014,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "Bad Romance",
      artists: ["Lady Gaga"],
      youtubeId: "qrO4YZeyl0I",
      duration: 294,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 2009,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "Someone Like You",
      artists: ["Adele"],
      youtubeId: "hLQl3WQQoQ0",
      duration: 285,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 2011,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "Levitating",
      artists: ["Dua Lipa"],
      youtubeId: "TUVcZfQe-Kw",
      duration: 203,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 2020,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "As It Was",
      artists: ["Harry Styles"],
      youtubeId: "H5v3kku4y6Q",
      duration: 167,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 2022,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
    {
      title: "Watermelon Sugar",
      artists: ["Harry Styles"],
      youtubeId: "E07s5ZYygMg",
      duration: 174,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 2019,
      countryOrigin: "international",
      categories: [categoryMap["pop"]],
    },
  ];

  // Polish/Local Songs
  const polishSongs = [
    {
      title: "Jestem Bogiem",
      artists: ["Paktofonika"],
      youtubeId: "vBD3Lhd8iPg",
      duration: 247,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 2000,
      countryOrigin: "polish",
      categories: [
        categoryMap["polish"],
        categoryMap["local"],
        categoryMap["rap"],
      ],
    },
    {
      title: "Ale jazz!",
      artists: ["Sarius"],
      youtubeId: "NWA3E1-9J-8",
      duration: 213,
      difficulty: "HARD" as Difficulty,
      releaseYear: 2017,
      countryOrigin: "polish",
      categories: [
        categoryMap["polish"],
        categoryMap["local"],
        categoryMap["rap"],
      ],
    },
    {
      title: "Sen o Warszawie",
      artists: ["Czesław Niemen"],
      youtubeId: "OkJgV_J5ZLQ",
      duration: 280,
      difficulty: "HARD" as Difficulty,
      releaseYear: 1967,
      countryOrigin: "polish",
      categories: [
        categoryMap["polish"],
        categoryMap["local"],
        categoryMap["rock"],
      ],
    },
  ];

  // Jazz/Other Songs
  const otherSongs = [
    {
      title: "Take Five",
      artists: ["Dave Brubeck Quartet"],
      youtubeId: "vmDDOFXSgAs",
      duration: 324,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1959,
      countryOrigin: "international",
      categories: [categoryMap["jazz"]],
    },
    {
      title: "What a Wonderful World",
      artists: ["Louis Armstrong"],
      youtubeId: "VqhCQZaH4Vs",
      duration: 139,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1967,
      countryOrigin: "international",
      categories: [categoryMap["jazz"]],
    },
    {
      title: "Fly Me to the Moon",
      artists: ["Frank Sinatra"],
      youtubeId: "ZEcqHA7dbwM",
      duration: 148,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1964,
      countryOrigin: "international",
      categories: [categoryMap["jazz"]],
    },
    {
      title: "No Woman, No Cry",
      artists: ["Bob Marley & The Wailers"],
      youtubeId: "IT8XvzIvi-U",
      duration: 231,
      difficulty: "NORMAL" as Difficulty,
      releaseYear: 1974,
      countryOrigin: "international",
      categories: [categoryMap["reggae"]],
    },
    {
      title: "Jolene",
      artists: ["Dolly Parton"],
      youtubeId: "Ixrje2rXLMA",
      duration: 162,
      difficulty: "HARD" as Difficulty,
      releaseYear: 1973,
      countryOrigin: "international",
      categories: [categoryMap["country"]],
    },
  ];

  // Combine all songs
  const allSongsData = [
    ...rapSongs,
    ...rockSongs,
    ...popSongs,
    ...polishSongs,
    ...otherSongs,
  ];

  // Create songs with their category relationships
  for (const songData of allSongsData) {
    const { categories: songCategories, ...songInfo } = songData;

    const song = await prisma.song.create({
      data: {
        ...songInfo,
        categories: {
          create: songCategories
            .filter((id): id is string => id !== undefined)
            .map((catId) => ({
              category: {
                connect: { id: catId },
              },
            })),
        },
      },
    });

    console.log(`✓ Created song: ${song.title} by ${song.artists.join(", ")}`);
  }

  console.log("\n✅ Seed completed successfully!");
  console.log(
    `📊 Created ${allSongsData.length} songs across ${categories.length} categories`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
