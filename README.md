# Prograde

Role-based professional learning platform. Phase-gated curriculum, multi-round assessments, built-in IDE, punch-clock time tracking, and an AI-powered admin course builder.

## Stack

- **Frontend**: React 18 + Babel (CDN, no build step) · JetBrains Mono + Inter
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Hosting**: GitHub Pages (testing) → production TBD

## Local Setup

1. Clone the repo
2. Create `config.js` in the root (this file is git-ignored):

```js
window.PROGRADE_CONFIG = {
  SUPABASE_URL:      "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",
  ANTHROPIC_API_KEY: "sk-ant-...",
};
```

3. Run the Supabase migration: open `supabase/001_schema.sql` in Supabase → SQL Editor → Run
4. Open `index.html` in a browser (or use `npx serve .`)

## GitHub Pages Deploy

1. Repo must be public
2. Settings → Pages → Branch: `main` → Folder: `/`
3. Push `index.html` — site is live at `https://sanank.github.io/prograde`
4. **Do not push `config.js`** — it's in `.gitignore`

> For production, use environment variable injection via CI to write `config.js` at deploy time.

## Build Phases

| Phase | Status | Description |
|-------|--------|-------------|
| A | ✅ Done | Auth, schema, routing, design system, admin CRUD skeleton |
| B | 🔜 Next | Full dashboard, phase map, topic list, punch clock |
| C | ⬜ | Topic viewer: notes, iframe resources, IDE (Monaco) |
| D | ⬜ | Multi-round quiz engine, phase skill test gate overlay |
| E | ⬜ | Admin AI course builder (topic/quiz/challenge generation) |
| F | ⬜ | Admin analytics: cohort view, time heatmaps, AI digest |

## Database Structure

Two datasets:

**Course Content** (admin-owned, learner read-only):
`courses → phases → resources → topics → topic_materials / quiz_questions / challenges`

**Learner Progress** (per-user, RLS enforced):
`user_profiles → phase_progress → topic_progress → quiz_attempts → challenge_submissions → sessions`

## Security

- All tables have Row Level Security (RLS) enabled
- Learners can only read/write their own progress rows
- Admins can read/write all course content and read all progress
- `config.js` must never be committed (enforced by `.gitignore`)
