# DevSparkAI Social Hub — Project Context Brief

Use this document as context for brainstorming about the product.

## What it is

DevSparkAI Social Hub is an AI-powered social media management tool (a lightweight Buffer/Hootsuite alternative). One person or a small team writes content once, and the tool tailors, schedules, and publishes it across multiple social platforms (LinkedIn, X/Twitter, Instagram), with analytics to track performance.

Built by DevSpark AI (devsparkai.com), a studio that builds websites and AI products. Live at https://socialhub.devsparkai.com.

## Target users

- Solo founders, freelancers, and creators who post on multiple platforms
- Small agencies/teams managing brand accounts (there is a Team feature)

## Current features

- **Auth**: email/password register + login, JWT sessions
- **Dashboard**: stat cards (last 30 days), connected-channel status ("channels live"), recent posts list, AI assistant callout
- **AI Content Planner**: enter a topic + duration (7/14/30/custom days) → AI generates a day-by-day content plan grouped by themes; each idea has a checkbox (done) and a "Create post" action that pre-fills the post editor
- **Create Post**: write once, AI generates tailored variants per platform (LinkedIn, X, Instagram) with hashtags; can also start from a topic or blog link
- **Content Calendar**: calendar view of planned/scheduled content
- **Scheduled Posts**: queue of upcoming posts; a background scheduler (APScheduler, checks every 20s) auto-publishes due posts
- **Social Accounts**: connect platform accounts; X (Twitter) uses real OAuth 2.0; access/refresh tokens stored encrypted
- **Analytics**: per-platform performance records and charts
- **Team**: team member management
- **Settings**: profile, API keys (users can store their own AI API keys), brand profile (voice/branding used to steer AI output)
- **Notifications**: in-app notification center (post published, publish failed, post due), 30s polling, mark read/dismiss

## Tech stack

- **Frontend**: Angular 21 (standalone components, signals, new control flow), SCSS. Design system: "broadcast console" — ink-black surfaces, spark-yellow accent (#ffd338), Space Grotesk + IBM Plex Mono fonts. Mobile responsive (drawer sidebar, adaptive grids).
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2, Pydantic 2, JWT via python-jose, passlib/bcrypt, APScheduler for background publishing, httpx for platform API calls, cryptography for token encryption.
- **Database**: SQLite locally; Postgres-ready via DATABASE_URL env (psycopg2).
- **Deployment**: Frontend on Netlify (socialhub.devsparkai.com), backend on Render free tier (apisocial.devsparkai.com), DNS on GoDaddy. Auto-deploy from GitHub (channupraveen/devsparkai-social-hub and .../devsparkai-social-hub-backend).

## Data model (main entities)

User, Post (content, per-platform content_variants JSON, status: draft/scheduled/published, scheduled_at/published_at), SocialAccount (platform, handle, encrypted OAuth tokens), ContentPlan (topic, days, items with day/title/theme/done), AnalyticsRecord, TeamMember, Notification, ApiKey, BrandProfile.

## API surface (route groups)

/api/auth, /api/dashboard, /api/posts, /api/ai (content generation), /api/social-accounts (+ /x/callback OAuth), /api/users, /api/team, /api/analytics, /api/api-keys, /api/brand, /api/plans, /api/notifications.

## Known limitations / current state

- Render free tier: backend sleeps after 15 min idle (~50s cold start)
- SQLite on Render = data wiped on restarts (Postgres via Neon planned)
- Only X OAuth is fully real; other platforms are partially mocked/manual
- Single-language (English), no billing/subscription system yet
- Global search bar in header is not wired up yet
- No password reset flow, no email verification

## Things worth brainstorming

- Monetization: pricing tiers, free plan limits, what to gate
- Which platform integration to prioritize next (LinkedIn API, Instagram Graph API)
- AI differentiation: brand-voice learning, best-time-to-post prediction, repurposing (blog → thread → carousel)
- Growth: SEO pages, template gallery, public roadmap
- Onboarding flow: time-to-first-scheduled-post
- Analytics depth vs simplicity
