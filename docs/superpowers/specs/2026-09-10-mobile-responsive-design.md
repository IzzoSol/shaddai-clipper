# Mobile-Responsive Cutting Room

**Status:** approved for implementation (bounded-scope, executed in one pass)
**Date:** 2026-09-10

## Problem

The Cutting Room (SHADDAI Clipper frontend, `src/`) is unusable on a phone. Confirmed by reading every route + the shared layout:

1. `src/components/shared/Layout.tsx` renders the left nav sidebar (`w-64`, or `w-16` collapsed) as a permanent flex child with **zero responsive breakpoints**. On a ~390px viewport this alone consumes most of the screen.
2. The same file's header row packs a "FREE BETA" badge, a "CUTTING ROOM" pill, a theme picker, and an avatar into one unbreaking row — overflows independently of the sidebar issue.
3. `src/routes/CandidateReviewPage.tsx` (the clip-generation screen — a core flow, not a side page) splits into `flex-1` candidate grid + a **fixed `w-72` (288px) `sticky` config panel** at the page level (not inside the already-responsive inner grid). On a 390px phone this leaves ~80px for the candidate grid. This is the worst offender after the sidebar.
4. `src/routes/SourceDetailPage.tsx`'s transcript panel has a fixed `h-[680px]` — no horizontal overflow, but eats nearly the whole viewport height on a phone before the user sees anything else.
5. `src/routes/UploadPage.tsx`'s empty-state dropzone uses `py-24 px-10` — appropriate on desktop, excessive on a short mobile viewport.
6. Smaller interactive elements (platform toggle pills, icon-only buttons) are sized for a mouse pointer, not confirmed to meet a comfortable touch-target size.

**Not broken, verified during audit (no change needed):**
- `ClipPreviewPage.tsx`'s `max-w-[680px]`/`max-w-[520px]` are max-width caps, not hard widths — already responsive.
- `DashboardPage.tsx`, `GalleryPage.tsx`, `SourcesPage.tsx`, `BrandProfilesPage.tsx` grids already use `grid-cols-1 sm:...` (or similar) responsive patterns.
- The upload flow already has a click-to-browse fallback (native mobile file picker), not just drag-and-drop.
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` is already present in `index.html`.

## Approach

Use Tailwind's existing default breakpoints (`sm` 640px, `md` 768px, `lg` 1024px) — consistent with what's already used across the codebase, no custom breakpoint config needed. Treat `md` as the phone/desktop split for layout-level changes (nav, page splits); use `sm` for finer content reflow, matching existing conventions in `DashboardPage`/`GalleryPage`.

## Changes

### 1. `Layout.tsx` — slide-out nav drawer below `md`
- Sidebar becomes `hidden md:flex` for the persistent desktop version.
- New mobile-only drawer: fixed off-canvas panel (`fixed inset-y-0 left-0 z-50 w-72`, translated off-screen by default, `translate-x-0` when open), backdrop (`fixed inset-0 bg-black/50`) that closes on tap, same nav items/links, closes automatically on route change (so tapping a link both navigates and closes the drawer).
- Header gets a hamburger button visible only `md:hidden`, plus the existing content simplifies: hide the "CUTTING ROOM" pill and theme picker behind `hidden sm:flex` (keep FREE BETA badge + avatar + hamburger visible — those matter most on mobile).
- New local state: `mobileNavOpen` (component-local `useState`, not global store — it's pure UI ephemera scoped to this component, matching how `sidebarCollapsed` already lives in `useUIStore` for the *desktop* toggle but doesn't need to be global for mobile).

### 2. `CandidateReviewPage.tsx` — stack the config panel
- Page-level split changes from `flex gap-6 items-start` to `flex flex-col lg:flex-row gap-6 lg:items-start`.
- Right panel: `w-72 shrink-0 sticky top-6` becomes `w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-6` — full width and in normal document flow (not sticky) on mobile/tablet, sticky sidebar only at `lg` and above where there's room for it beside the grid.
- Order: panel renders after the grid in source order already, which is correct for mobile (browse candidates first, configure after) — no reorder needed.

### 3. `SourceDetailPage.tsx` — responsive transcript height
- `h-[680px]` → `h-[50vh] md:h-[680px]` so it takes a sane fraction of the actual viewport on mobile instead of a desktop-tuned fixed pixel value.

### 4. `UploadPage.tsx` — trim mobile padding
- Empty-state dropzone: `py-24 px-10` → `py-12 px-5 sm:py-24 sm:px-10`.
- Same treatment for the error-state block (`py-24 px-10` there too).

### 5. Touch targets pass
- Audit interactive elements below ~40px effective tap area across the touched pages (nav items, platform pills, icon buttons in headers) and bump padding where clearly undersized. Judgment call per element during implementation, not a mechanical global rule — most of the existing `px-3 py-2.5` nav items and `px-4 py-2` buttons already clear a reasonable bar.

## Out of scope

- No PWA/installability, no offline support, no native app wrapper.
- No tablet-specific breakpoint beyond what `md`/`lg` already provide.
- Not reworking `BatchProgressPage`, `ClipEditorPage`, `ClipPreviewPage`, `ExportQueuePage`, `BrandProfileEditorPage`, `GalleryPage` structurally — audit found no page-breaking issues there; they inherit the `Layout.tsx` fix and already have reasonable inner responsiveness. Will still be included in the manual mobile test pass below, and fixed if that pass finds something the static audit missed.

## Testing

No existing frontend test suite in this repo (backend has `*.test.ts` files via `tsx`; frontend has none) — verification is manual, matching how the rest of this repo's UI work has been verified this session:
1. Resize/emulate a ~390px-wide viewport.
2. Click through every route: Dashboard → Upload (file picker path) → Upload (paste-URL path) → Sources → Source Detail → Candidate Review → Batch Progress → Gallery → Export Queue → Brand Profiles → Brand Profile Editor.
3. Confirm: no horizontal scrolling on any page, nav drawer opens/closes/navigates correctly, primary CTA on each page is reachable and tappable, no visually overlapping/clipped elements.
4. Re-run `npx tsc -b` for a clean type-check after all edits.
