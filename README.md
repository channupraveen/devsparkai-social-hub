# DevSparkAI Social Hub — Frontend

**AI-powered social media management dashboard built with Angular 21.**

DevSparkAI Social Hub is a product-focused SaaS application for creating, planning, scheduling and analysing social content from one workspace.

Live application: https://socialhub.devsparkai.com

Backend: [devsparkai-social-hub-backend](https://github.com/channupraveen/devsparkai-social-hub-backend)

---

## Product

The goal is to reduce the repetitive work involved in maintaining a consistent social presence.

The application combines:

- AI-assisted content generation
- Platform-specific content variants
- Content planning
- Post creation and scheduling
- Social account connections
- Analytics
- Brand profiles
- Team management

The interface is designed around a single authenticated workspace rather than separate tools for each social platform.

---

## Main screens

| Area | Purpose |
|---|---|
| Dashboard | Overview of content activity and connected channels |
| Content Planner | Generate a day-by-day content plan from a topic and duration |
| Create Post | Create, edit and prepare platform-specific content |
| Content Calendar | View planned content by date |
| Scheduled Posts | Manage upcoming and scheduled content |
| Analytics | Review reach, engagement and follower trends |
| Social Accounts | Connect and manage publishing channels |
| Team | Manage workspace members |
| Settings | Configure AI providers and brand profile |

---

## Frontend architecture

The application uses Angular routing, standalone components, route guards and HTTP interceptors.

```text
Angular Application
│
├── Auth Layout
│   ├── Login
│   ├── Register
│   └── Forgot Password
│
└── Main Layout
    ├── Dashboard
    ├── Content Planner
    ├── Create Post
    ├── Content Calendar
    ├── Scheduled Posts
    ├── Analytics
    ├── Social Accounts
    ├── Team
    └── Settings
             │
             ▼
       HTTP Services
             │
             ▼
      FastAPI Backend
```

### Authentication flow

```text
Login / Register
       │
       ▼
     JWT
       │
       ▼
Auth Interceptor
       │
       ▼
Authenticated API requests
       │
       ▼
FastAPI
```

Protected application routes use an authentication guard, while the HTTP interceptor attaches authentication information to API requests.

---

## AI content workflow

The frontend supports a workflow where a user provides a topic and content requirements, then receives platform-specific variants.

```text
Topic + duration / instructions
             │
             ▼
       Content Planner
             │
             ▼
        FastAPI API
             │
             ▼
       AI provider
             │
             ▼
Platform-specific variants
             │
             ▼
 Edit → Schedule → Publish
```

Supported content destinations include LinkedIn, X, Instagram, Facebook and YouTube at the content-generation layer.

---

## Technology stack

| Category | Technology |
|---|---|
| Framework | Angular 21 |
| Language | TypeScript |
| Reactive APIs | RxJS |
| Routing | Angular Router |
| HTTP | Angular HttpClient |
| Authentication | JWT + route guard + interceptor |
| Testing | Vitest |
| Package manager | npm |

---

## Project structure

```text
src/app/
├── guards/          # Authentication guards
├── interceptors/    # HTTP authentication interceptor
├── layouts/         # Auth and application layouts
├── pages/
│   ├── dashboard/
│   ├── content-planner/
│   ├── create-post/
│   ├── content-calendar/
│   ├── scheduled-posts/
│   ├── analytics/
│   ├── social-accounts/
│   ├── team/
│   └── settings/
├── services/        # API/application services
└── app.routes.ts    # Application routing
```

---

## Local development

### Requirements

- Node.js
- npm 10+
- Angular CLI 21

### Install

```bash
git clone https://github.com/channupraveen/devsparkai-social-hub.git
cd devsparkai-social-hub
npm install
```

### Start

```bash
npm start
```

Open:

```text
http://localhost:4200
```

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```

---

## Backend

The frontend communicates with a FastAPI backend responsible for authentication, AI generation, posts, scheduling, social OAuth, analytics and workspace data.

See the backend repository for API setup and architecture.

---

## Engineering highlights

This project demonstrates:

- Building a complete SaaS dashboard with Angular
- Authenticated routing and HTTP interception
- AI-assisted product workflows
- Complex content-management UI
- Calendar and scheduling experiences
- Analytics-oriented interfaces
- Separation between frontend presentation and backend business logic
- Integration with a FastAPI API

---

## Author

**Praveen Kumar**

GitHub: https://github.com/channupraveen

Part of the DevSparkAI product ecosystem.

## License

MIT
