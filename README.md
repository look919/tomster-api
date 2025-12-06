# Tomster Music Game API 🎵

A modern REST API for a music guessing game inspired by Hitster, with unlimited songs and dynamic QR code generation support.

## 🎮 Game Concept

Players guess song details (title, artist, release year) based on audio clips. The game features:

- **6 Categories**: Rap, Rock, Pop, Local (Polish), Other (Jazz/Country/Classical/Reggae), Random
- **2 Difficulty Levels**:
  - **Easy**: 30s clip from start, more popular songs (popularity ≥ 60), 3 points max + bonus token
  - **Hard**: 8-10s random clip, less popular songs (popularity < 60), 5 points max + bonus token
- **Token System**: Each player starts with a token to steal/correct answers from other players
- **Session Tracking**: Avoids song repetition within game sessions
- **Scoring**: Points awarded for correct title, artist, and year guesses

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Set up your database connection
# Create a .env file with:
DATABASE_URL="postgresql://user:password@localhost:5432/tomster"

# Run database migrations
pnpm db:migrate

# Seed the database with example songs
pnpm db:seed

# Start the development server
pnpm start
```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Health Check

```http
GET /
GET /health
```

### Game Sessions

#### Create a New Session

```http
POST /sessions
Content-Type: application/json

{
  "targetScore": 30  // Optional, defaults to 30
}

Response: 201 Created
{
  "id": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "isActive": true,
  "targetScore": 30,
  "playedSongsCount": 0
}
```

#### Get Session Details

```http
GET /sessions/:id

Response: 200 OK
{
  "id": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "isActive": true,
  "targetScore": 30,
  "playedSongsCount": 5
}
```

#### Get Played Songs in Session

```http
GET /sessions/:id/played-songs

Response: 200 OK
{
  "sessionId": "uuid",
  "playedSongs": [
    {
      "id": "uuid",
      "playedAt": "2024-01-01T00:00:00.000Z",
      "song": {
        "title": "Lose Yourself",
        "artists": ["Eminem"],
        "releaseYear": 2002
      }
    }
  ]
}
```

#### End Session

```http
DELETE /sessions/:id

Response: 204 No Content
```

### Game Play

#### Get Random Song

```http
POST /sessions/:sessionId/random-song
Content-Type: application/json

{
  "category": "rap",     // rap | rock | pop | local | other | random
  "difficulty": "EASY"   // EASY | HARD
}

Response: 200 OK
{
  "id": "uuid",
  "title": "Lose Yourself",
  "artists": ["Eminem"],
  "youtubeId": "_Yhyp-_hX2s",
  "difficulty": "EASY",
  "clipDuration": 30,        // seconds
  "clipStartTime": 0,        // offset in seconds
  "releaseYear": 2002,
  "maxPoints": 3,            // 3 for EASY, 5 for HARD
  "bonusTokenAvailable": true
}
```

#### Reveal Song Answer

```http
GET /songs/:songId/reveal

Response: 200 OK
{
  "id": "uuid",
  "title": "Lose Yourself",
  "artists": ["Eminem"],
  "releaseYear": 2002,
  "youtubeId": "_Yhyp-_hX2s"
}
```

## 🎯 Game Rules & Scoring

### Difficulty Comparison

| Aspect          | Easy                 | Hard                  |
| --------------- | -------------------- | --------------------- |
| Clip Duration   | 30 seconds           | 8-10 seconds          |
| Clip Position   | From start           | Random middle section |
| Song Popularity | ≥ 60%                | < 60%                 |
| Title Points    | 1                    | 2                     |
| Artist Points   | 1                    | 2                     |
| Year Points     | 1                    | 1                     |
| Max Points      | 3                    | 5                     |
| Bonus Token     | ✓ (all correct)      | ✓ (all correct)       |
| Penalty         | -1 (nothing correct) | -1 (nothing correct)  |

### Game Flow

1. Player throws dice to determine category
2. Player selects difficulty (EASY or HARD)
3. App plays song clip based on difficulty settings
4. Player guesses title, artist, and release year range
5. Other players can use tokens to steal/correct answers (clockwise)
6. Points awarded based on correct answers
7. Next player's turn (clockwise)
8. First to 30 points wins (configurable)

## 🗄️ Database Schema

### Models

- **Song**: Contains song metadata (title, artists, YouTube ID, popularity, release year)
- **Category**: Music categories (rap, rock, pop, etc.)
- **SongCategory**: Many-to-many relationship between songs and categories
- **GameSession**: Active game sessions with target score
- **PlayedSong**: Tracks which songs were played in each session

### Key Features

- Automatic session tracking prevents song repetition
- Popularity-based difficulty filtering
- Multi-category support for songs
- Efficient indexing for fast queries

## 🛠️ Development

### Database Commands

```bash
# Create a new migration
pnpm db:migrate

# Seed database with test data
pnpm db:seed

# Open Prisma Studio (database GUI)
pnpm db:studio

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset
```

### Project Structure

```
tomster-api/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── src/
│   ├── lib/
│   │   └── prisma.ts      # Prisma client setup
│   ├── routes/
│   │   ├── sessions.ts    # Session management
│   │   └── game.ts        # Game logic
│   ├── types/
│   │   └── game.ts        # TypeScript types
│   └── server.ts          # Main server file
└── package.json
```

## 🎨 Future Enhancements

### Planned Features

1. **QR Code Generation**: Generate unique QR codes for each song
2. **Mobile App Integration**: Native iOS/Android apps
3. **Custom Year Ranges**: Define custom release year ranges for guessing
4. **Multiplayer Sessions**: Real-time multiplayer support with WebSockets
5. **User Profiles**: Track player statistics and achievements
6. **Custom Playlists**: Create custom song collections
7. **Audio Streaming**: Direct audio playback integration
8. **Leaderboards**: Global and session-based leaderboards
9. **Admin Panel**: Web interface for managing songs and categories
10. **Spotify/Apple Music Integration**: Fetch songs from streaming services

### Suggested Improvements

- Add authentication/authorization
- Implement rate limiting
- Add caching layer (Redis)
- WebSocket support for real-time updates
- Docker containerization
- CI/CD pipeline
- Comprehensive testing suite
- API documentation with Swagger
- Analytics and monitoring

## 📝 Adding New Songs

You can add songs manually or extend the seed script:

```typescript
await prisma.song.create({
  data: {
    title: "Your Song Title",
    artists: ["Artist Name"],
    youtubeId: "YouTube_Video_ID",
    duration: 240, // in seconds
    popularity: 85, // 0-100
    releaseYear: 2020,
    categories: {
      create: [{ category: { connect: { name: "pop" } } }],
    },
  },
});
```

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

ISC

---

Built with ❤️ using Fastify, Prisma, and TypeScript
