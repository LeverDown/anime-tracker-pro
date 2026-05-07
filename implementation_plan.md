# Implementation Plan: Social Intelligence Hub
**Project:** AnimeTracker — Community Module Revamp  
**Version:** 2.0  
**Status:** Pending Review  
**Last Updated:** 2025-07-13  
**Author:** Antigravity AI  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architectural Overview](#2-architectural-overview)
3. [Risk Assessment](#3-risk-assessment)
4. [Delivery Phases](#4-delivery-phases)
5. [Backend Specification](#5-backend-specification)
   - 5.1 [Database Schema Changes](#51-database-schema-changes)
   - 5.2 [API Endpoint Specification](#52-api-endpoint-specification)
   - 5.3 [Real-Time Event Architecture](#53-real-time-event-architecture)
   - 5.4 [Caching Strategy](#54-caching-strategy)
6. [Frontend Specification](#6-frontend-specification)
   - 6.1 [Type Definitions](#61-type-definitions)
   - 6.2 [Component Breakdown](#62-component-breakdown)
7. [Security & Access Control](#7-security--access-control)
8. [Testing Strategy](#8-testing-strategy)
9. [Migration Strategy](#9-migration-strategy)
10. [Open Questions & Decisions Required](#10-open-questions--decisions-required)

---

## 1. Executive Summary

This plan describes the architectural expansion of the current community module into a multi-faceted **Social Intelligence Hub**. The hub will serve as the platform's center for user activity, social discovery, threaded discussion, private messaging, and community moderation.

**Scope:** New database models, REST and real-time endpoints, and a suite of frontend components.  
**Delivery model:** 4 phased releases to reduce migration risk.  
**Primary risks:** Database aggregation performance, real-time architecture for bidirectional DMs, and schema complexity from introducing 9+ new relational models.

> **⚠️ MAJOR ARCHITECTURAL CHANGE**  
> This is not a feature addition — it is a foundational expansion. All phases require engineering sign-off before the prior phase is deployed to production. No phase should be merged to `main` while a prior phase has unresolved defects.

---

## 2. Architectural Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                         │
│  ActivityFeed │ DiscussionBoard │ PrivateCommsHUD │ AchievementGrid│
└────────────────────────────┬─────────────────────────────────────┘
                              │ REST + SSE + WebSocket
┌────────────────────────────▼─────────────────────────────────────┐
│                      BACKEND (FastAPI / Python)                    │
│  /api/community/*  │  /api/comms/*  │  /api/admin/*               │
│  Role middleware   │  Auth guards   │  Rate limiters               │
└──────────┬──────────────────┬────────────────────┬────────────────┘
           │                  │                    │
    ┌──────▼──────┐   ┌───────▼──────┐   ┌────────▼───────┐
    │  PostgreSQL  │   │    Redis      │   │  WebSocket /SSE│
    │  (primary)   │   │  (cache/pub) │   │  (events)      │
    └─────────────┘   └──────────────┘   └────────────────┘
```

**Key architectural decisions:**
- REST for all standard CRUD endpoints.
- SSE for one-directional push notifications (feed, follows, mentions).
- **WebSocket for DMs** — Approved as the primary transport for real-time chat.
- Redis for leaderboard caching, compatibility score caching, and pub/sub for real-time broadcast.
- All admin-sensitive operations protected by role middleware, not just by convention.

---

## 3. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Large multi-model migration failure | High | Medium | Phased migrations; each phase independently reversible |
| Leaderboard/Trending query performance degradation | High | High | Materialized views + Redis TTL cache; never compute on-demand |
| Compatibility score endpoint becomes a bottleneck | Medium | High | Pre-compute on list update; cache in Redis |
| DM privacy breach via missing auth | Critical | Low | Per-conversation participant validation on every request |
| Concurrent forum post tree corruption | Medium | Medium | DB-level row locking; integration tests under concurrency |
| Uncontrolled admin access via `/api/admin/*` | Critical | Low | Dedicated `is_admin` role check middleware; audit log on every action |

---

## 4. Delivery Phases

The implementation is split into four independently deployable phases. Each phase must be fully tested and signed off before the next begins.

### Phase 1 — Identity & Social Graph *(Week 1–2)*
> Foundation for all subsequent social features.
- `User` model extensions (`is_public`, `timezone`)
- `Friendship` model (follower/following)
- `UserActivity` model
- Basic feed endpoint (`GET /api/community/feed`)
- Frontend: `ActivityFeed` component, updated type definitions

### Phase 2 — Engagement: Reviews & Achievements *(Week 3–4)*
> Content engagement layer.
- `CommunityReview` model
- `Achievement` and `UserAchievement` models (normalized, not JSON on User)
- Achievement progress endpoints
- Frontend: `AchievementGrid`, `CompatibilityMeter`

### Phase 3 — Forums & Discussion *(Week 5–6)*
> Threaded content layer.
- `DiscussionThread` and `DiscussionPost` models
- Forum endpoints (thread CRUD, post CRUD, spoiler flagging)
- Frontend: `DiscussionBoard` with spoiler masking

### Phase 4 — Messaging, Moderation & Admin *(Week 7–9)*
> High-risk systems; deployed last.
- `Conversation` and `Message` models
- `UserReport` and `ModerationLog` models
- DM WebSocket implementation
- Admin endpoints with role middleware
- Frontend: `PrivateCommsHUD`, `OverseerTerminal`

---

## 5. Backend Specification

### 5.1 Database Schema Changes

> All migrations are additive and independently reversible unless noted. Run `alembic upgrade head` per phase.

---

#### Phase 1 Migrations

**`users` table — extensions**
```sql
ALTER TABLE users
  ADD COLUMN is_public        BOOLEAN     NOT NULL DEFAULT TRUE,
  ADD COLUMN timezone         VARCHAR(64) NOT NULL DEFAULT 'UTC';
-- Note: 'achievements' will NOT be stored as JSON here.
-- See UserAchievement in Phase 2.
```

**New table: `friendships`**
```sql
CREATE TABLE friendships (
  id            SERIAL      PRIMARY KEY,
  follower_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX idx_friendships_follower  ON friendships(follower_id);
CREATE INDEX idx_friendships_following ON friendships(following_id);
```

**New table: `user_activity`**
```sql
CREATE TYPE activity_type AS ENUM ('watch', 'rate', 'complete', 'drop', 'review', 'follow');

CREATE TABLE user_activity (
  id          SERIAL          PRIMARY KEY,
  user_id     INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        activity_type   NOT NULL,
  entity_id   INTEGER,                    -- anime_id or user_id depending on type
  entity_type VARCHAR(32),                -- 'anime' | 'user'
  metadata    JSONB,                      -- flexible extra data (e.g. rating value)
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_activity_user    ON user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_entity  ON user_activity(entity_id, entity_type, created_at DESC);
```

---

#### Phase 2 Migrations

**New table: `community_reviews`**
```sql
CREATE TABLE community_reviews (
  id              SERIAL      PRIMARY KEY,
  user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id        INTEGER     NOT NULL,
  body            TEXT        NOT NULL,
  contains_spoiler BOOLEAN    NOT NULL DEFAULT FALSE,
  helpful_count   INTEGER     NOT NULL DEFAULT 0,
  not_helpful_count INTEGER   NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,           -- soft delete
  UNIQUE (user_id, anime_id)
);
```

**New table: `achievements`** *(definition table)*
```sql
CREATE TABLE achievements (
  id          SERIAL      PRIMARY KEY,
  slug        VARCHAR(64) NOT NULL UNIQUE,  -- e.g. 'completed_100'
  name        VARCHAR(128) NOT NULL,
  description TEXT        NOT NULL,
  icon_url    VARCHAR(256)
);
```

> **Implementation Note — Achievement Logic:**  
> Since rules are **hardcoded**, the backend will utilize an `AchievementRegistry` that maps each `slug` to a Python function. When a `user_activity` is logged, the registry evaluates all relevant functions to check for new unlocks.

**New table: `user_achievements`** *(join table)*
```sql
CREATE TABLE user_achievements (
  id             SERIAL      PRIMARY KEY,
  user_id        INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER     NOT NULL REFERENCES achievements(id),
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress       NUMERIC(5,2) NOT NULL DEFAULT 0,  -- 0.00–100.00 percent
  UNIQUE (user_id, achievement_id)
);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
```

> **Why not JSON on `users.achievements`?**  
> Storing achievements as JSON on the User row prevents querying, aggregation, and leaderboard ranking by achievement. Normalized tables allow `WHERE achievement_id = X` and `ORDER BY earned_at`, which JSON blobs cannot do efficiently.

---

#### Phase 3 Migrations

**New table: `discussion_threads`**
```sql
CREATE TABLE discussion_threads (
  id          SERIAL      PRIMARY KEY,
  author_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  anime_id    INTEGER,                    -- NULL = general discussion
  title       VARCHAR(256) NOT NULL,
  is_pinned   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_locked   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_spoiler  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ                -- soft delete
);
CREATE INDEX idx_threads_anime    ON discussion_threads(anime_id, created_at DESC);
CREATE INDEX idx_threads_author   ON discussion_threads(author_id);
```

**New table: `discussion_posts`**
```sql
CREATE TABLE discussion_posts (
  id          SERIAL      PRIMARY KEY,
  thread_id   INTEGER     NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  parent_id   INTEGER     REFERENCES discussion_posts(id) ON DELETE CASCADE,  -- nested replies
  body        TEXT        NOT NULL,
  is_spoiler  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ                -- soft delete
);
CREATE INDEX idx_posts_thread     ON discussion_posts(thread_id, created_at ASC);
CREATE INDEX idx_posts_parent     ON discussion_posts(parent_id);
```

---

#### Phase 4 Migrations

**New table: `conversations`**
```sql
CREATE TABLE conversations (
  id          SERIAL      PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
```

**New table: `messages`**
```sql
CREATE TYPE message_type AS ENUM ('text', 'anime_card');

CREATE TABLE messages (
  id              SERIAL        PRIMARY KEY,
  conversation_id INTEGER       NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  type            message_type  NOT NULL DEFAULT 'text',
  body            TEXT          NOT NULL,    -- plaintext; see security note
  metadata        JSONB,                     -- for anime_card payload
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ               -- soft delete
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
```

> **Security Note — Message Encryption:**  
> **End-to-End Encryption (E2EE) is REQUIRED.** Message content must be encrypted on the client side before transmission and stored as ciphertext in the database. A key exchange mechanism (e.g., Signal Protocol or X3DH) will be implemented in Phase 4. The `body` column will store the encrypted payload. Public keys for users will be stored in a new `user_public_keys` table.

**New table: `user_reports`**
```sql
CREATE TYPE report_reason AS ENUM ('spam', 'spoiler', 'harassment', 'misinformation', 'other');
CREATE TYPE report_status AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE user_reports (
  id              SERIAL        PRIMARY KEY,
  reporter_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  target_type     VARCHAR(32)   NOT NULL,   -- 'post' | 'thread' | 'message' | 'user'
  target_id       INTEGER       NOT NULL,
  reason          report_reason NOT NULL,
  notes           TEXT,
  status          report_status NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reports_status ON user_reports(status, created_at DESC);
```

**New table: `moderation_log`**
```sql
CREATE TYPE mod_action AS ENUM ('ban', 'unban', 'delete_post', 'delete_thread', 'pin_thread', 'lock_thread', 'resolve_report', 'dismiss_report');

CREATE TABLE moderation_log (
  id          SERIAL      PRIMARY KEY,
  admin_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action      mod_action  NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id   INTEGER     NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_modlog_admin  ON moderation_log(admin_id, created_at DESC);
CREATE INDEX idx_modlog_target ON moderation_log(target_type, target_id);
```

---

### 5.2 API Endpoint Specification

All endpoints require authentication via JWT bearer token unless marked `[public]`.  
All list endpoints support cursor-based pagination: `?cursor=<id>&limit=<n>` (max 50).

---

#### Community & Feed

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/community/feed` | Paginated activity feed for the current user and followed users | Required |
| `GET` | `/api/community/feed/{user_id}` | Public activity feed for a specific user | `[public if is_public]` |
| `GET` | `/api/community/trending` | Trending anime by activity volume *(Redis-cached, 10-min TTL)* | `[public]` |
| `GET` | `/api/community/leaderboard` | Top users by watch count, rating count, etc. *(Redis-cached, 1-hr TTL)* | `[public]` |
| `GET` | `/api/community/compatibility/{user_id}` | Compatibility score vs. current user *(Redis-cached per pair, invalidated on list update)* | Required |
| `GET` | `/api/community/achievements` | All achievements and current user progress | Required |
| `POST` | `/api/community/review` | Submit a review | Required |
| `GET` | `/api/community/review/{anime_id}` | Paginated reviews for an anime | `[public]` |
| `POST` | `/api/community/review/{id}/helpful` | Vote helpful/not-helpful | Required |

**Compatibility Score — Implementation Note:**  
Do **not** compute on every request. Pre-compute on list mutation and cache in Redis:

```python
# Cache key pattern
COMPAT_KEY = "compat:{min(uid_a, uid_b)}:{max(uid_a, uid_b)}"
COMPAT_TTL = 3600  # 1 hour; also invalidate on watchlist write
```

---

#### Social Graph

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/social/follow/{user_id}` | Follow a user | Required |
| `DELETE` | `/api/social/follow/{user_id}` | Unfollow a user | Required |
| `GET` | `/api/social/followers` | Current user's followers | Required |
| `GET` | `/api/social/following` | Users the current user follows | Required |

---

#### Forums

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/forum/threads` | List threads (filterable by `anime_id`) | `[public]` |
| `POST` | `/api/forum/threads` | Create a new thread | Required |
| `GET` | `/api/forum/threads/{id}` | Get thread with paginated posts | `[public]` |
| `POST` | `/api/forum/threads/{id}/posts` | Reply to a thread | Required |
| `PATCH` | `/api/forum/posts/{id}` | Edit a post *(author only, within 15-min window)* | Required |
| `DELETE` | `/api/forum/posts/{id}` | Soft-delete a post *(author or admin)* | Required |
| `POST` | `/api/forum/report` | Report a post or thread | Required |

---

#### Messaging

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/comms/conversations` | List active conversations | Required |
| `POST` | `/api/comms/conversations` | Start a new conversation | Required |
| `GET` | `/api/comms/conversations/{id}/messages` | Paginated message history | Required *(participant only)* |
| `WS` | `/ws/comms/{conversation_id}` | Real-time message stream | Required *(participant only)* |

> **Auth on WebSocket:** Pass JWT as a query param `?token=<jwt>` on the WS handshake. Validate before upgrading the connection. Reject non-participants immediately after upgrade.

---

#### Admin

All endpoints under `/api/admin/*` require `is_admin = TRUE` on the authenticated user, enforced by a dedicated middleware layer — not inline checks.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/reports` | List open reports (filterable by status, type) |
| `PATCH` | `/api/admin/reports/{id}` | Resolve or dismiss a report |
| `POST` | `/api/admin/users/{id}/ban` | Ban a user |
| `DELETE` | `/api/admin/users/{id}/ban` | Unban a user |
| `PATCH` | `/api/admin/threads/{id}` | Pin or lock a thread |
| `DELETE` | `/api/admin/posts/{id}` | Hard-delete a post (irreversible; use sparingly) |

All admin actions **must** write a row to `moderation_log` automatically via a service-layer wrapper, not manually per endpoint.

---

### 5.3 Real-Time Event Architecture

**SSE** (`/api/events/stream`) — one-directional push for notifications:

| Event Type | Trigger |
|---|---|
| `follow_alert` | A user follows the current user |
| `mention_alert` | Current user is `@mentioned` in a post |
| `reaction_alert` | A review or post receives a helpful vote |
| `activity_alert` | A followed user completes or rates an anime |

**WebSocket** (`/ws/comms/{conversation_id}`) — bidirectional for DMs:
- Ping/pong heartbeat every 30 seconds; close connection on 2 missed pongs.
- Message payload schema:
```json
{
  "type": "message",
  "conversation_id": 42,
  "body": "...",
  "message_type": "text"
}
```

**Redis Pub/Sub:**  
SSE connections subscribe to a Redis channel (`user:{id}:events`). When any backend service publishes an event for a user, all SSE worker instances pick it up. This is necessary for horizontal scaling.

---

### 5.4 Caching Strategy

| Resource | Cache Key | TTL | Invalidation |
|---|---|---|---|
| Leaderboard | `leaderboard:{type}` | 1 hour | Cron job recalculates + re-caches |
| Trending anime | `trending:daily` | 10 minutes | TTL expiry only |
| Compatibility score | `compat:{uid_a}:{uid_b}` | 1 hour | On either user's watchlist write |
| User profile (public) | `profile:{user_id}` | 15 minutes | On profile update |

> Leaderboards should **never** be computed on-demand. Use a scheduled task (every 30 min) to run the aggregation and write results to Redis. The endpoint only reads from cache.

---

## 6. Frontend Specification

### 6.1 Type Definitions

**File:** `types/community.ts` *(new file — do not extend `anime.ts`)*

```typescript
export type ActivityType = 'watch' | 'rate' | 'complete' | 'drop' | 'review' | 'follow';

export interface ActivityItem {
  id: number;
  user: UserSummary;
  type: ActivityType;
  entityId: number;
  entityType: 'anime' | 'user';
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601
}

export interface CommunityReview {
  id: number;
  user: UserSummary;
  animeId: number;
  body: string;
  containsSpoiler: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
}

export interface DiscussionThread {
  id: number;
  author: UserSummary;
  animeId?: number;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  isSpoiler: boolean;
  replyCount: number;
  createdAt: string;
}

export interface DiscussionPost {
  id: number;
  threadId: number;
  author: UserSummary;
  parentId?: number;
  body: string;
  isSpoiler: boolean;
  children?: DiscussionPost[]; // hydrated client-side
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: number;
  slug: string;
  name: string;
  description: string;
  iconUrl?: string;
}

export interface UserAchievement {
  achievement: Achievement;
  earnedAt?: string; // undefined = not yet earned
  progress: number; // 0–100
}

export interface LeaderboardEntry {
  rank: number;
  user: UserSummary;
  score: number;
  metric: 'watch_count' | 'rating_count' | 'review_count';
}

export interface CompatibilityScore {
  userId: number;
  score: number; // 0–100
  commonCount: number;
  breakdown: Record<string, number>;
}

export interface Message {
  id: number;
  conversationId: number;
  sender: UserSummary;
  type: 'text' | 'anime_card';
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: number;
  participants: UserSummary[];
  lastMessage?: Message;
  unreadCount: number;
}

export interface UserSummary {
  id: number;
  username: string;
  avatarUrl?: string;
}
```

---

### 6.2 Component Breakdown

All components must comply with the **RoninHub RDS** style guide (scanlines, HUD borders). Each component is independently lazy-loaded.

#### `ActivityFeed`
- Renders paginated `ActivityCard` components.
- Supports infinite scroll via Intersection Observer.
- Shows skeleton loaders on initial load; error boundary with retry on failure.

#### `DiscussionBoard`
- Tabbed view: All Discussions / Anime-specific.
- Threaded replies rendered recursively up to 3 levels deep; "View more replies" expands beyond.
- **Spoiler masking:** Posts/threads flagged `isSpoiler` render blurred with a "Reveal Spoiler" toggle. Toggle state is per-session, not persisted.

#### `PrivateCommsHUD`
- Minimised panel anchored to viewport bottom-right.
- Connects to `/ws/comms/{conversation_id}` on expand.
- Handles connection states: `connecting`, `open`, `reconnecting`, `closed`.
- Displays unread badge count from `Conversation.unreadCount`.
- Gracefully falls back to polling (`GET /api/comms/conversations/{id}/messages?after=<id>`) if WebSocket is unavailable.

#### `AchievementGrid`
- Displays all achievements; locked ones rendered greyed-out.
- Progress bar for in-progress achievements.
- Tooltip on hover showing unlock criteria.

#### `CompatibilityMeter`
- Circular gauge showing score 0–100.
- Breakdown section: genre overlap, rating correlation, completion rate similarity.
- Triggered from user profile card; score fetched lazily on mount.

#### `OverseerTerminal` *(admin only)*
- Route-guarded: only renders for `is_admin` users.
- Tabbed: Open Reports / Moderation Log / User Management.
- All actions require a confirmation modal before dispatch.
- Displays `moderation_log` entries in reverse chronological order.

#### `community/page.tsx` — Layout
```
┌─────────────────────────────────────────┐
│  [ FEED ] [ DISCUSSIONS ] [ DISCOVERY ] [ LEADERBOARDS ] │
├─────────────────────────────────────────┤
│                                         │
│   <Tab-specific content renders here>   │
│                                         │
└─────────────────────────────────────────┘
```
- Tab state persisted in URL query param (`?tab=feed`).
- Each tab is lazy-loaded; no tab pre-fetches data until active.

---

## 7. Security & Access Control

### Role Model

```python
# Middleware applied to all routes at the router level
# Not inline per-endpoint — all admin routes go through this

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")
    return current_user
```

`is_admin` is a boolean column on the `users` table. Do not use environment variables or hardcoded user IDs as a substitute.

### Conversation Authorization

Every DM endpoint must validate the requesting user is a participant:

```python
def require_conversation_participant(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    participant = db.query(ConversationParticipant).filter_by(
        conversation_id=conversation_id,
        user_id=current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    return participant
```

### Soft Deletes

The following models use `deleted_at` (soft delete) rather than hard deletes: `community_reviews`, `discussion_threads`, `discussion_posts`, `messages`. All queries must include `WHERE deleted_at IS NULL` unless explicitly accessing deleted content via admin endpoints.

### Rate Limiting

| Endpoint Group | Limit |
|---|---|
| `POST /api/forum/threads` | 5 per hour per user |
| `POST /api/forum/threads/{id}/posts` | 30 per hour per user |
| `POST /api/comms/send` (WS message) | 60 per minute per user |
| `POST /api/community/review` | 1 per anime per user (DB constraint) |
| `POST /api/admin/*` | 100 per hour per admin |

---

## 8. Testing Strategy

### Automated Tests

**Unit Tests**
- Compatibility score calculation: verify correct overlap algorithm and edge cases (empty lists, identical lists, no overlap).
- Achievement unlock logic: verify criteria evaluation for each achievement type.
- Soft-delete filtering: confirm `deleted_at IS NULL` is enforced across all relevant model queries.

**Integration Tests**
- `POST /api/social/follow` → triggers `follow_alert` SSE event on target user's stream.
- `POST /api/forum/threads/{id}/posts` under 20 concurrent requests → assert correct parent-child tree structure in DB with no orphaned nodes.
- `GET /api/community/leaderboard` → assert response is served from Redis cache; assert DB is not queried.
- Admin role enforcement: assert all `/api/admin/*` endpoints return `403` for non-admin JWTs.
- Conversation participant guard: assert `GET /api/comms/conversations/{id}/messages` returns `403` for a valid user who is not a participant.

**Load / Performance Tests**
- Trending endpoint (`GET /api/community/trending`): assert P95 < 50ms under 500 concurrent requests (expected: cache hit).
- Activity feed (`GET /api/community/feed`): assert P95 < 200ms for a user following 500 others with 10,000 activity rows.

### Manual Verification Checklist

**Phase 1 — Social Loop**
- [ ] Completing an anime creates a `user_activity` row of type `complete`.
- [ ] A follower sees that activity in their feed within 5 seconds.
- [ ] A `activity_alert` SSE event fires on the follower's stream.

**Phase 2 — Achievement Integrity**
- [ ] Earning an achievement creates a `user_achievements` row with `progress = 100`.
- [ ] Leaderboard stats match raw DB counts on a seeded test dataset.
- [ ] Compatibility score on cached read matches score on cold (no-cache) read.

**Phase 3 — Forum Integrity**
- [ ] Spoiler-flagged posts render masked on initial load.
- [ ] Nested replies display at correct depth with correct parent association.
- [ ] Soft-deleted posts show `[deleted]` placeholder, not the original body.

**Phase 4 — DM & Moderation**
- [ ] Messages appear in real time for both participants without page refresh.
- [ ] Non-participants cannot access conversation messages (verify `403`).
- [ ] All admin actions create a corresponding `moderation_log` entry.
- [ ] Banning a user invalidates their active JWT sessions.

**UI / UX**
- [ ] All new components pass RoninHub RDS review (scanlines, HUD borders, colour tokens).
- [ ] All interactive states covered: loading, empty, error.
- [ ] Mobile responsive: all components functional at 375px viewport width.

---

## 9. Migration Strategy

Migrations are run per phase via Alembic. Each migration file is prefixed with the phase number.

```
migrations/
  versions/
    001_phase1_user_extensions.py
    002_phase1_friendships.py
    003_phase1_user_activity.py
    004_phase2_reviews.py
    005_phase2_achievements.py
    006_phase3_discussion_threads.py
    007_phase3_discussion_posts.py
    008_phase4_conversations.py
    009_phase4_messages.py
    010_phase4_reports_and_modlog.py
```

**Rollback procedure per phase:**
```bash
alembic downgrade -1     # Roll back one migration
alembic downgrade <rev>  # Roll back to a specific revision
```

No migration should contain data mutations unless explicitly noted and reviewed. Schema changes only.

### API Versioning

All new endpoints introduced in this plan are to be registered under `/api/v1/`. Existing endpoints will be migrated to `/api/v1/` during Phase 1 with backwards-compatible aliases maintained at `/api/` until a deprecation window closes (suggested: 60 days post-Phase 4 launch).

---

## 10. Open Questions & Decisions Required

These items are **blockers or significant risks** and require a decision before the relevant phase begins.

| # | Question | Phase Blocked | Decision | Status |
|---|---|---|---|---|
| 1 | **WebSocket vs. SSE for DMs** | Phase 4 | **Option A:** WebSocket infrastructure approved. | Decided |
| 2 | **E2EE for messages** | Phase 4 | **Option B:** E2EE is mandatory. Requires key exchange scoping. | Decided |
| 3 | **Leaderboard recalculation cadence** | Phase 1 | **Option A:** 30-min cron schedule. | Decided |
| 4 | **Achievement criteria ownership** | Phase 2 | **Option A:** Hardcoded in application logic (Slug-to-Function mapping). | Decided |
| 5 | **Admin role provisioning** | Phase 4 | **CLI Script:** A dedicated management script to promote/demote users. | Decided |

---

*End of Implementation Plan v2.0*
