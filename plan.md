# Implementation Plan

## Plan

### Phase 1: Database Schema Changes (Data Model)
1. Add `coAuthorEmails` field to the `article` table (store as JSON/text array similar to `tagList`)
2. Create new `article_lock` table with columns:
   - `article_id` (foreign key to article)
   - `user_id` (foreign key to user - who holds the lock)
   - `locked_at` (timestamp when lock was acquired)
   - `last_seen_at` (timestamp of last activity - for 5-minute timeout)
3. Create database migration for both changes

### Phase 2: Backend - Co-Authors Data Model (45 min)
4. Update `article.entity.ts` to include `coAuthorEmails` property (ArrayType, similar to tagList)
5. Update `create-article.dto.ts` to include optional `coAuthorEmails: string[]`
6. Update `update-article.dto.ts` to include optional `coAuthorEmails: string[]`
7. Update `article.interface.ts` to include coAuthorEmails in ArticleData interface
8. Update `article.service.ts`:
   - Modify authorization checks to allow both author AND co-authors to edit
   - Update `findOne`, `create`, `update` methods to handle co-authors
9. Update `toJSON()` method in `article.entity.ts` to include coAuthorEmails in response

### Phase 3: Backend - Article Locking Pattern (1.5 hrs)
10. Create `article-lock.entity.ts` for the lock table
11. Create `article-lock.service.ts` with methods:
    - `acquireLock(articleId, userId)` - attempt to lock article
    - `releaseLock(articleId, userId)` - release lock when saving/navigating away
    - `updateHeartbeat(articleId, userId)` - update last_seen_at
    - `checkLock(articleId)` - check if article is locked and by whom
    - `cleanExpiredLocks()` - remove locks older than 5 minutes
12. Add new endpoints in `article.controller.ts`:
    - `POST /articles/:slug/lock` - acquire lock before editing
    - `PUT /articles/:slug/lock/heartbeat` - keep lock alive
    - `DELETE /articles/:slug/lock` - release lock
    - `GET /articles/:slug/lock` - check lock status
13. Update `PUT /articles/:slug` endpoint to verify caller holds the lock before saving
14. Add scheduled task/cron to clean expired locks every minute

### Phase 4: Frontend - Co-Authors UI (Basic Input)
15. Update `ArticleEditor.slice.ts` to include `coAuthorEmails` in article state
16. Update `ArticleEditor.tsx` to add co-authors field:
    - For ADVANCED: Add multi-select dropdown component
    - Fetch list of all users from backend API
    - Store selected user emails in `coAuthorEmails` array
17. Update `conduit.ts` API service to include coAuthorEmails in article payloads

### Phase 5: Frontend - Locking Mechanism
18. Create `useLockManager` custom hook to handle locking logic:
    - Acquire lock when EditArticle page loads
    - Send heartbeat every 30 seconds to keep lock alive
    - Release lock on unmount or navigation away
19. Update `EditArticle` page to:
    - Call lock endpoint before showing editor
    - Show error message if lock acquisition fails (article locked by another user)
    - Display who currently has the lock
    - Handle lock loss (show error if heartbeat fails)
20. Add error handling for lost connections/expired locks
21. Implement cleanup on page unload/beforeunload event

### Phase 6: API Integration & User Lookup
22. Add `GET /users` endpoint in backend to fetch all users (for dropdown)
23. Update frontend to fetch and populate user list in multi-select dropdown
24. Ensure dropdown shows user names but submits email addresses

### Phase 7: Testing & Validation
25. Test creating article with co-authors (Test 1)
26. Test co-author can edit article (Test 2)
27. Test locking mechanism prevents simultaneous edits (Test 3 - ADVANCED)
28. Take screenshots of all acceptance tests
29. Verify works with multiple backend instances (stateless - lock in database)

## Decisions

### Decision 1: Store Co-Authors as Email Array in Article Table
- **Alternative 1:** Create separate `article_co_authors` junction table with article_id and user_id
- **Alternative 2:** Store as JSON array of emails in article table
- **Alternative 3:** Store as text array (similar to tagList) in article table
- **Rationale:** Use **Alternative 3** (text array similar to tagList) because:
  - Consistent with existing `tagList` pattern in the codebase
  - MikroORM already has ArrayType configured for MySQL
  - Simpler migration and queries
  - User emails are immutable identifiers suitable for this use case
  - Avoids extra joins for read operations
  - Works well with AWS Aurora MySQL replication

### Decision 2: Implement Article Locking with Database Table (ADVANCED)
- **Alternative 1:** No locking - last save wins (BASIC approach)
- **Alternative 2:** Use database table for locks with polling
- **Alternative 3:** Use WebSockets for real-time lock notifications
- **Rationale:** Use **Alternative 2** (database table with polling) because:
  - Works with stateless backend across multiple ECS Fargate instances
  - No need for sticky sessions or WebSocket infrastructure
  - Simpler to implement and test within time constraints
  - Lock state persists in Aurora MySQL (shared across all backend instances)
  - Frontend can poll lock status and send heartbeats every 30 seconds
  - Fits within existing AWS architecture (no additional services needed)
  - Scheduled cleanup task removes expired locks automatically

### Decision 3: Multi-Select Dropdown using Existing User List
- **Alternative 1:** Allow users to type any email addresses (may not be valid users)
- **Alternative 2:** Fetch all users and provide multi-select dropdown
- **Alternative 3:** Implement autocomplete search as user types
- **Rationale:** Use **Alternative 2** (multi-select dropdown from all users) because:
  - Meets ADVANCED requirement precisely
  - Prevents invalid email addresses
  - Better UX - users can see available co-authors
  - Simpler implementation than autocomplete
  - Acceptable performance - user list likely small in scope of this app
  - Can reuse existing user list API or create simple GET /users endpoint

## Notes

### AWS Architecture Compatibility
- **Stateless Design:** All lock state stored in Aurora MySQL database, not in-memory
- **No Sticky Sessions Required:** Lock checking works across multiple ECS Fargate instances
- **Auto-Scaling Safe:** As backend scales from 1-10 instances, all instances share lock state via database
- **No Infrastructure Changes Needed:** No new AWS services required (no WebSockets, no Redis)
- **Load Balancer Compatible:** All lock operations are HTTP REST calls that work through ALB

### Implementation Notes
- Use polling (every 30 sec) instead of WebSockets for lock heartbeat - simpler and works with current architecture
- Clean expired locks with scheduled task (cron-like) in NestJS using `@nestjs/schedule`
- On frontend, use `useEffect` cleanup to release locks when user navigates away
- Handle browser tab close with `beforeunload` event to release lock
- "Last seen" = last heartbeat received (user has edit page open and sends ping every 30 sec)
- Frontend should retry heartbeat on network errors before showing "lock lost" error

### Out of Scope (Per Requirements)
- Original author display on view pages remains unchanged
- No modifications to other pages beyond create/edit article
- Optional story (force unlock) not included in base implementation
