# Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed and running
- [ ] pnpm installed (`npm install -g pnpm`)

## Step-by-Step Setup

### 1. Create Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE tomster;
```

### 2. Configure Environment

```bash
# Copy example env file
copy .env.example .env

# Edit .env and set your database URL
# DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/tomster"
```

### 3. Install & Setup

```bash
# Install dependencies (if not already done)
pnpm install

# Generate Prisma Client
npx prisma generate

# Run database migration
pnpm db:migrate
# Enter migration name when prompted, e.g.: "init"

# Seed database with sample songs
pnpm db:seed
```

### 4. Start Server

```bash
pnpm start
```

Server will be running at: http://localhost:3000

## Test the API

### Create a Game Session

```bash
curl -X POST http://localhost:3000/sessions -H "Content-Type: application/json" -d "{\"targetScore\": 30}"
```

Save the session ID from the response!

### Get a Random Song

```bash
# Replace SESSION_ID with your actual session ID
curl -X POST http://localhost:3000/sessions/SESSION_ID/random-song -H "Content-Type: application/json" -d "{\"category\": \"rap\", \"difficulty\": \"EASY\"}"
```

### View Played Songs

```bash
curl http://localhost:3000/sessions/SESSION_ID/played-songs
```

## Troubleshooting

### Database Connection Error

- Ensure PostgreSQL is running
- Verify credentials in `.env` file
- Check if database exists

### Prisma Client Errors

```bash
npx prisma generate
```

### Port Already in Use

Edit `src/server.ts` and change port 3000 to another port

### Migration Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Next Steps

1. Read `README.md` for full API documentation
2. Read `IMPLEMENTATION.md` for technical details
3. Use Prisma Studio to view data: `pnpm db:studio`
4. Add your own songs to the database
5. Start building your frontend/mobile app!

## Useful Commands

```bash
# View database in browser
pnpm db:studio

# Create new migration
pnpm db:migrate

# Re-seed database
pnpm db:seed

# Check Prisma schema
npx prisma format

# Start development server
pnpm start
```
