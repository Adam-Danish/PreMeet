# PreMeet design system

Generated from ui-ux-pro-max's verified `productivity dashboard minimal` search and adapted to PreMeet's existing Next.js workspace. The first, broader query returned a marketing-page/glass direction; it was rejected because this is a working application.

## Product and direction

PreMeet helps ASEAN founders decide who to meet, prepare a useful opener, and record meetings, pilots, and deals. Preserve the profile, five-person recommendations, shared outcome log, cumulative dashboard, event search, event details, and history. Existing API contracts and demo disclosure remain intact.

Use the Flat Design recommendation: typography-led surfaces, restrained teal, fast feedback, no decorative effects that compete with the job. The frontend design draw selected Editorial greeting, seed 1045392176, adapted to the ui-ux-pro-max typography and palette. Plus Jakarta Sans is the single family; the app's own identity is its conversation journey, from profile to shortlist to outcome.

## Semantic tokens

| Role | Value |
| --- | --- |
| Canvas | #f7f9f8 |
| Surface | #ffffff |
| Soft surface | #f0f4f2 |
| Ink | #192b28 |
| Secondary text | #586963 |
| Primary | #176b5b |
| Primary hover | #105345 |
| Primary soft | #e7f2ed |
| Border | #e1e8e4 |
| Control boundary | #899b93 |
| Error ink / surface | #a82c35 / #fff0f1 |
| Warning ink / surface | #80551a / #fff5df |
| Focus | #176b5b |

The search recommended #0d9488; the deeper primary above supports white control text. Orange is reserved for attention states rather than a competing brand accent. Use neutral navigation selection, teal on the main action and outcome data. All ordinary text must meet 4.5:1 contrast. No user-selected dark theme existed; deliver a coherent light theme rather than introducing a partial theme toggle.

## Typography and geometry

- Plus Jakarta Sans, locally served with `next/font`, system sans fallback.
- Page title 28–32px/600; section title 18–20px/600; body 14px/1.6; input text 16px; metadata 12px minimum; figures 32px/400 with tabular numerals.
- Spacing: 4, 8, 12, 16, 24, 32, 48px. One 24px main layout gap.
- Desktop sidebar 224px; content centered up to 1100px, 32px gutters. On tablet and phone navigation becomes a compact top bar and an accessible menu.
- Cards 16px radius, controls 8px, tags 6px. Quiet borders and tonal separation. Shadows only for floating menus.
- Lucide outline icons, 18px normally, 20px for navigation, decorative icons hidden from assistive technology.

## Screen questions

- Game plan: Who should I meet, and why? Editable profile beside recommendations; real empty state before generation.
- Outcome log: What happened after each conversation? Stage controls with explicit saved/saving/error feedback.
- Dashboard: Which contacts became business outcomes? Actual totals and an accessible cumulative bar comparison.
- Events: Which event fits my next opportunity? Search by event, place, or topic; date-led event cards.
- Details: Where and when is this event? Grouped dates, venue, organiser, attendees, and an explicit return action.
- History: What did past events produce? Actual per-event outcome counts, clearly marked sample data in demo mode.

## Interaction and accessibility

Native buttons, links, labels, fieldsets, and checkboxes. Visible 3px focus ring. Minimum 44px main controls. Mobile inputs 16px. No hover-only information. Menu exposes expanded state, closes on Escape and navigation, and returns focus to its trigger. Skip link to main content. Form submission focuses a linked error summary and retains field-level errors. Async actions show immediate feedback, disable conflicting submission, and never discard an existing plan on a failed retry. Loading skeletons preserve the recommendation frame. Reduced-motion disables animation and smooth scrolling. Search-empty states offer a clear reset action. Backend errors retain retry controls.

## Verification scope

Check TypeScript, ESLint, and production build. Inspect real browser screenshots at desktop, tablet, 375px phone, and landscape, plus reduced motion. Exercise all six views and API success/error/loading flows using intercepted fixture responses when a live AI/backend credential is unavailable; do not change backend behavior to enable previews.
