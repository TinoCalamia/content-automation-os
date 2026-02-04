# Content Automation Hub

A single Vercel-hosted app that lets you save source content (LinkedIn posts, YouTube videos, blogs, notes), enrich it, and automatically generate platform-optimized drafts for LinkedIn + X, including on-brand images generated via Gemini.

## Features

- **Source Capture**: Save URLs, notes, and files as source content
- **Content Enrichment**: Automatic metadata extraction, summarization, and key points
- **Background Files**: Manage tone of voice, brand guidelines, and platform algorithms
- **AI Generation**: Two-pass generation with quality checks for LinkedIn and X
- **Image Generation**: On-brand images via Gemini
- **Manual Publishing**: Copy-to-clipboard workflow with platform links
- **Daily Automation**: Vercel Cron-powered scheduled generation

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui components
- Supabase Auth

### Backend
- FastAPI (Python) for AI/generation pipelines
- Gemini API for LLM and image generation
- Supabase (PostgreSQL + Storage)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account
- Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/content-automation-os.git
cd content-automation-os
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
cd api-python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

5. Run database migrations:
```bash
npx supabase db push
```

6. Start the development servers:

Frontend:
```bash
npm run dev
```

Backend:
```bash
cd api-python
uvicorn main:app --reload
```

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   └── api/               # Next.js API routes
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── capture/           # Source capture components
│   │   ├── library/           # Library view components
│   │   ├── kb/                # Knowledge base components
│   │   ├── drafts/            # Draft editor components
│   │   └── publish/           # Publishing components
│   ├── lib/                   # Utilities and services
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript definitions
├── api-python/                # FastAPI backend
│   ├── api/                   # API route handlers
│   │   ├── enrichment/        # Content enrichment
│   │   ├── generation/        # Draft generation
│   │   └── images/            # Image generation
│   └── libs/                  # Business logic
├── supabase/                  # Supabase migrations
└── content/                   # Optional local KB files
    ├── kb/                    # Algorithm guides, tone, brand
    ├── examples/              # Example posts
    └── prompts/               # Generation prompts
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `NEXT_PUBLIC_FASTAPI_URL` | FastAPI backend URL | Yes |
| `CRON_SECRET` | Secret for cron endpoint | Yes |

## Deployment

### Vercel (Frontend)

1. Connect your repository to Vercel
2. Add environment variables
3. Deploy

### FastAPI Backend

Option A: Deploy as Vercel Python Serverless Functions
Option B: Deploy to Railway/Render

## License

MIT
