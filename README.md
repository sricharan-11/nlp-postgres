# NLP to SQL - Natural Language Database Query Tool

A modern web application that converts natural language questions into SQL queries using AI (Gemini/Claude) and executes them against PostgreSQL databases.

![NLP to SQL](https://via.placeholder.com/800x400/1a1a1a/6366f1?text=NLP+to+SQL)

## Features

- 🗣️ **Natural Language Queries**: Ask questions in plain English
- 🤖 **AI-Powered SQL Generation**: Uses Gemini (primary) or Claude (fallback)
- 📊 **Schema Explorer**: Browse your database structure
- 📋 **Results Display**: View query results in a clean table format
- 🔒 **Safe Execution**: SELECT-only queries with validation
- 🌙 **Dark Theme**: Modern, beautiful UI

## Tech Stack

- **Frontend**: Next.js 15 + React + TypeScript
- **Backend**: Next.js API Routes + TypeScript
- **Database**: PostgreSQL
- **LLM**: Google Gemini (primary), Anthropic Claude (secondary)
- **Styling**: Vanilla CSS with CSS Custom Properties

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Gemini API key (and optionally Claude API key)

### Installation

1. Clone and install dependencies:
   ```bash
   cd nlp-with-postgres
   npm install
   ```

2. Create `.env.local` file:
   ```env
   # Database Configuration
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_NAME=your_database
   DATABASE_USER=postgres
   DATABASE_PASSWORD=your_password
   DATABASE_SSL=false

   # LLM API Keys
   GEMINI_API_KEY=your-gemini-api-key
   CLAUDE_API_KEY=your-claude-api-key  # Optional

   # Application Settings
   QUERY_TIMEOUT_MS=30000
   MAX_RESULT_ROWS=1000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

### POST `/api/query`
Execute a natural language query.

**Request:**
```json
{
  "query": "Show me all customers who ordered last month",
  "provider": "gemini"  // optional: "gemini" or "claude"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sql": "SELECT * FROM customers...",
    "explanation": "This query retrieves...",
    "confidence": "high",
    "results": [...],
    "rowCount": 42,
    "executionTime": 123
  }
}
```

### GET `/api/schema`
Fetch database schema.

### GET `/api/connection`
Check database and LLM connection status.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── query/route.ts      # NL query endpoint
│   │   ├── schema/route.ts     # Schema endpoint
│   │   └── connection/route.ts # Health check
│   ├── page.tsx                # Main chat interface
│   ├── globals.css             # Global styles
│   └── page.module.css         # Page-specific styles
└── lib/
    ├── db/
    │   ├── connection.ts       # PostgreSQL pool
    │   ├── schema.ts           # Schema introspection
    │   ├── executor.ts         # Safe query execution
    │   └── types.ts            # TypeScript interfaces
    └── llm/
        ├── gemini.ts           # Gemini API client
        ├── claude.ts           # Claude API client
        ├── prompts.ts          # System prompts
        ├── sql-generator.ts    # SQL generation orchestrator
        └── types.ts            # TypeScript interfaces
```

## Security

- **SELECT-only**: Only SELECT and WITH (CTE) queries are allowed
- **Query Validation**: All generated SQL is validated before execution
- **Row Limits**: Results are automatically limited to prevent data floods
- **Timeout Protection**: Queries have configurable timeout limits
- **No Credentials Exposure**: Database credentials are server-side only

## Deployment

### Ubuntu Server 24.04 LTS

1. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. Clone and install:
   ```bash
   git clone <your-repo>
   cd nlp-with-postgres
   npm install
   ```

3. Create production environment:
   ```bash
   cp .env.local .env.production.local
   # Edit with production values
   ```

4. Build and start:
   ```bash
   npm run build
   npm start
   ```

5. (Optional) Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start npm --name "nlp-sql" -- start
   pm2 save
   ```

## License

MIT
