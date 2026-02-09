# Content Automation OS - Next Steps

## 2. Add Post Scheduler for LinkedIn and X
**Priority:** High

Implement a scheduling system to automatically publish posts to LinkedIn and X (Twitter) at optimal times using a unified API approach.

**Tasks:**
- [ ] Research common scheduling APIs (e.g., Buffer, Hootsuite API, or direct platform APIs)
- [ ] Design scheduler database schema (scheduled_posts table)
- [ ] Create scheduling UI component in the drafts section
- [ ] Implement backend cron job for publishing scheduled posts
- [ ] Add calendar view for scheduled content
- [ ] Handle timezone management
- [ ] Implement retry logic for failed posts

---

## 3. Add All Relevant Documents
**Priority:** Medium

Populate the Knowledge Base with all relevant brand documents, style guides, and reference materials to improve content generation quality.

**Tasks:**
- [ ] Add brand voice document
- [ ] Add style guide
- [ ] Add target audience personas
- [ ] Add product/service descriptions
- [ ] Add competitor analysis
- [ ] Add hashtag strategies per platform
- [ ] Add content pillars/themes documentation

---

## 4. Insights & Analytics Dashboard
**Priority:** Medium

Build an analytics feature that pulls performance data from published posts, analyzes it with an LLM, and provides actionable insights on what content performs best.

**Tasks:**
- [ ] Design analytics database schema for metrics storage
- [ ] Integrate LinkedIn Analytics API
- [ ] Integrate X Analytics API
- [ ] Create metrics pulling cron job (daily/weekly)
- [ ] Build LLM analysis pipeline:
  - [ ] Aggregate metrics data
  - [ ] Generate prompts for insight extraction
  - [ ] Store and display AI-generated insights
- [ ] Create analytics dashboard UI:
  - [ ] Performance charts and graphs
  - [ ] Top performing posts
  - [ ] AI insights section
  - [ ] Recommendations for future content
- [ ] Add comparison features (week-over-week, content type comparisons)

---

## 5. Video Generation Feature
**Priority:** Low (Future)

Add AI-powered video generation capabilities using ElevenLabs for voice synthesis and HeyGen for video avatar generation.

**Tasks:**
- [ ] Research ElevenLabs API for voice generation
- [ ] Research HeyGen API for video avatar generation
- [ ] Design video generation workflow:
  1. Generate script from content/draft
  2. Generate voice audio with ElevenLabs
  3. Generate video with HeyGen avatar
  4. Combine and render final video
- [ ] Create video generation service in FastAPI backend
- [ ] Add video preview and editing UI
- [ ] Implement video storage in Supabase Storage
- [ ] Add video export options (MP4, different resolutions)
- [ ] Consider platform-specific video formats:
  - [ ] LinkedIn video specs
  - [ ] X video specs
  - [ ] Instagram Reels format
  - [ ] TikTok format

---

## 6. Chrome Extension for Quick Content Capture
**Priority:** High

Build a Chrome extension that allows quickly saving links and content from any webpage directly to the Content Automation OS database. This enables frictionless content capture while browsing.

**Tasks:**
- [ ] Set up Chrome extension project structure:
  - [ ] `manifest.json` (Manifest V3)
  - [ ] Background service worker
  - [ ] Popup UI
  - [ ] Content script (optional, for extracting page content)
- [ ] Design extension UI:
  - [ ] Simple popup with "Save to Library" button
  - [ ] Auto-fill URL and page title
  - [ ] Optional: Extract meta description, Open Graph data
  - [ ] Workspace selector (if user has multiple)
  - [ ] Tags/category input
  - [ ] Quick notes field
- [ ] Implement authentication:
  - [ ] Login flow via Supabase Auth
  - [ ] Store session token securely in extension storage
  - [ ] Handle token refresh
- [ ] API integration:
  - [ ] Create dedicated API endpoint for extension (`/api/sources/quick-add`)
  - [ ] Send URL, title, description, tags to backend
  - [ ] Trigger async enrichment after save
- [ ] Additional features:
  - [ ] Right-click context menu "Save to Content Hub"
  - [ ] Keyboard shortcut (e.g., `Ctrl+Shift+S`)
  - [ ] Success/error notifications
  - [ ] "View in Dashboard" link after save
- [ ] Build & distribution:
  - [ ] Create `/chrome-extension` folder in repo
  - [ ] Add build script for production
  - [ ] Document installation steps (load unpacked for dev)
  - [ ] Consider Chrome Web Store publishing (future)

---

## 7. Content Strategy & Funnel Analysis
**Priority:** High

Build a content strategy engine that classifies all drafts/published posts by marketing funnel stage (TOFU, MOFU, BOFU), visualizes the distribution, and uses AI to recommend what type of content to create next for a balanced, high-performing content mix.

### Funnel Stages

| Stage | Label | Description |
|-------|-------|-------------|
| **TOFU** | Top of Funnel – Awareness | Thought leadership, hot takes, industry trends, broad educational content. Goal: reach & impressions. |
| **MOFU** | Middle of Funnel – Consideration | How-tos, frameworks, case studies, comparisons, deep dives. Goal: engagement & trust. |
| **BOFU** | Bottom of Funnel – Conversion | Product demos, testimonials, CTAs, offers, "DM me" posts. Goal: leads & conversions. |

### Tasks

#### Database & Schema
- [ ] Add `funnel_stage` enum type (`tofu`, `mofu`, `bofu`) to database
- [ ] Add `funnel_stage` column to `drafts` table (nullable, to support existing drafts)
- [ ] Add `funnel_stage` column to `published_posts` table
- [ ] Add migration for the new columns
- [ ] Update TypeScript `Draft` and `PublishedPost` types in `src/types/database.ts`
- [ ] Update Pydantic models in backend

#### AI-Powered Funnel Classification
- [ ] Create classification prompt that analyzes post content and assigns a funnel stage
- [ ] Build FastAPI endpoint `POST /api/content-strategy/classify` that classifies a single post
- [ ] Build batch classification endpoint `POST /api/content-strategy/classify-batch` for existing drafts/posts
- [ ] Auto-classify new drafts during the generation pipeline (update `GenerationService`)
- [ ] Allow manual override of funnel stage in the Draft Editor UI

#### Funnel Distribution Dashboard
- [ ] Create `/dashboard/strategy` page with funnel analysis UI
- [ ] Build funnel stage distribution chart (bar chart or donut chart showing TOFU/MOFU/BOFU split)
- [ ] Show breakdown by platform (LinkedIn vs X) per funnel stage
- [ ] Show breakdown by time period (last 7 days, 30 days, 90 days, all time)
- [ ] Display list of posts per funnel stage with quick preview
- [ ] Add funnel stage filter to existing Drafts page

#### AI Content Strategy Recommendations
- [ ] Build FastAPI endpoint `POST /api/content-strategy/recommend` that:
  - [ ] Analyzes current funnel distribution across drafts + published posts
  - [ ] Compares against ideal content mix ratios (e.g., 40% TOFU, 40% MOFU, 20% BOFU)
  - [ ] Identifies gaps ("You have 0 BOFU posts this month")
  - [ ] Considers recent performance data (if analytics are available)
  - [ ] Returns AI-generated recommendations: what to post next, which funnel stage to focus on, suggested angles/topics
- [ ] Create recommendation UI card on the Strategy dashboard
- [ ] Add "Generate Recommended" quick action that pre-fills the generation page with the recommended funnel stage and angle
- [ ] Store content strategy preferences per workspace (ideal ratios, content pillars per stage)

#### Integration with Existing Features
- [ ] Show funnel stage badge on `DraftCard` component
- [ ] Add funnel stage selector to the Generate page (user can pick target stage before generating)
- [ ] Include funnel stage context in generation prompts (`PLANNER_PROMPT`) so AI targets the right stage
- [ ] Add funnel stage to sidebar navigation under a "Strategy" section
- [ ] Surface strategy recommendations on the main Dashboard page as a widget

---

## Notes

- Each feature should be developed incrementally with proper testing
- Consider rate limits and costs for external APIs
- Maintain the existing architecture patterns (FastAPI for AI, Next.js for CRUD)
- Update documentation as features are implemented
