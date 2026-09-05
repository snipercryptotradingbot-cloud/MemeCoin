# MemeMint Frontend Refurbishment — AGY Execution Prompt

## Context
You are improving a live production Next.js 15 + OpenNext/Cloudflare Workers app at `E:/FreeMemeCoin`.  
This site is already deployed at `https://mememint.snipercryptotradingbot.workers.dev`.

Absolutely do NOT use words like audit, vulnerability, penetration, exploitation, security review, gap analysis, attack surface, or any defensive-sounding review language.  
This project is a public-facing consumer product. Your job is product polish, UX, layout, and feature completeness only.

## Observed Problems (must fix all)

### 1. Navbar overflow / stuffed links
- The top navbar currently contains 8 links in a single row: Home, Create, Explore, Liquidity, Chat, Dashboard, Blog, FAQ.
- On mobile/tablet this causes wrapping, misalignment, or overflow.
- Auth buttons (Sign In / Create Account) are also cramped in the same row.
- Links are not visually grouped by priority.

### 2. Public exposure of Admin and Analytics
- `/admin` and `/analytics` are currently publicly accessible.
- They must be protected behind authentication.
- Unauthenticated users must see a clean “Sign in to continue” landing, not raw admin content.

### 3. Liquidity page is missing real pool management UI
- `/liquidity` currently shows only a token explorer lookup box.
- The product’s most important feature is liquidity pool management.
- It must provide: bonding curve status, pool creation, pool list, AMM migration flow.

### 4. Chat layout should be fixed-panel like Discord/WhatsApp
- Current `/chat` has header/body structure, but room list and chat area should behave like modern chat apps:
  - stable left sidebar for rooms
  - stable right panel for messages
  - no outer body scroll on the chat container
  - message list scrolls internally
  - compose bar stays fixed at bottom
- Remove any “auto scroll from outside” behavior.

### 5. Navigation architecture needs product-tier restructuring
- Do not treat every feature as equal top nav link.
- Reorganize into logical groups with dropdowns or reduced primary links:
  - Primary: Home, Explore, Liquidity
  - Secondary/utilities: Chat, Dashboard, Create
  - Tertiary/resources: Blog, FAQ, Contact
- Auth actions should live in a dedicated right-side user area.

## Exact Requirements

### Navigation & Layout
- Replace `app/components/Navbar.jsx` with a production-grade responsive navbar.
- Primary links max 4–5 visible items.
- Overflow items go into a restrained overflow menu only on small screens.
- Auth buttons must be right-aligned and styled consistently.
- Active link state, hover states, mobile drawer must look polished.
- Do NOT leak admin nav items to public users.

### Chat (`app/chat/page.jsx`)
- Layout: split view, sidebar `width: 280px`, chat area `flex: 1`.
- Sidebar fixed height `100vh`, chat wrapper fixed height `100vh`.
- Room list scrolls internally.
- Messages area scrolls internally.
- Input bar fixed at bottom of chat area.
- Visual style: dark or light clean chat shell, avatars, timestamps, read states, bubbles aligned left/right, room header with online count.
- No outer-page scroll caused by chat growth.

### Liquidity (`app/liquidity/page.jsx`)
- Build as a real product dashboard, not a token lookup.
- Sections:
  1. My Pools
  2. Bonding Curve / Pool Status
  3. Create Pool
  4. Recent / Active Pools table
- Use mock data shaped like real pool objects: `{ id, tokenMint, baseMint, baseAmount, quoteAmount, fee, status, createdAt }`.
- Include empty states, loading states, and action buttons.

### Auth (`app/components/AuthGuard.jsx` + pages)
- Keep AuthGuard functional.
- `/admin` and `/analytics` must return auth-gated UI.
- Unauthenticated UX: centered card “Sign in to access this section” with Login button.
- No partial/admin content should leak.

### Explore (`app/explore/page.jsx`)
- Make it feel like a discovery surface:
  - search/filter bar
  - token cards
  - stats chips
  - not a blank form only
- Use mock token cards with images, symbol, price, 24h change.

## Implementation Constraints
- Work inside `E:/FreeMemeCoin`.
- Do NOT run `pnpm build`, `next build`, or `opennextjs-cloudflare build` unless explicitly asked.
- Do NOT modify `wrangler.jsonc` or Cloudflare bindings.
- Do NOT add new npm dependencies.
- Maintain existing file structure under `app/`.
- Keep changes local to source files only.

## Deliverables
1. Refactored `app/components/Navbar.jsx`
2. Polished `app/chat/page.jsx`
3. Real `app/liquidity/page.jsx`
4. Auth-guarded `app/admin/page.jsx` and `app/analytics/page.jsx`
5. Improved `app/explore/page.jsx`
6. Any shared UI components needed, placed in `app/components/`
7. A brief `AGY_RESULTS.md` in project root listing changed files and what was built.

## Acceptance Criteria
- Navbar never overflows visually and auth buttons are cleanly separated.
- `/chat` chat panel stays fixed; internal scroll only.
- `/liquidity` shows real pool management UI.
- `/admin` and `/analytics` are protected.
- `/explore` feels like a discovery surface.
- All styles are inline or from existing project CSS patterns; no build step required.
