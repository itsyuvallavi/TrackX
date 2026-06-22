# TrackX Web Design

TrackX is a private product dashboard, not a marketing site. Design should serve quick review, correction, and trust.

Detailed tokens, component sizing, layout rules, and verification guidance live in [web-design-system.md](./web-design-system.md).

## Direction

- Use a modern finance-app UI: white surfaces, light gray canvas, bright lime accents, deep green actions, and semantic warning/success/danger states.
- Keep the first screen operational: budget risk, month totals, and recent ledger activity.
- Prefer dense but readable layouts over large decorative sections.
- Avoid nested cards, decorative gradients, glassmorphism, and generic AI dashboard styling.
- Use short copy. Every label should help the user decide or act.

## Motion

- Motion is only for feedback or state clarity.
- Keep UI transitions under 300ms.
- Animate color, opacity, and transform only.
- Use `ease-trackx-out` for crisp response.
- Respect `prefers-reduced-motion`.
- Gate hover movement to devices with real hover support.

## Components

- Use shared primitives before creating page-specific UI.
- Buttons need visible focus and subtle active press feedback.
- Empty, warning, and error states should be explicit and calm.
- Mobile is a first-class review surface because Telegram is the primary input.

## Visual Checks

Use Playwright for screenshot-level UI smoke checks after visual changes:

```sh
pnpm exec playwright screenshot --browser=chromium --viewport-size=390,844 http://localhost:3000/login /private/tmp/trackx-login.png
```

Run `pnpm web:dev` first.

## Sources

This direction was adapted from the reviewed design-skill repos:

- Emil Kowalski skills: purposeful motion and responsive button feedback.
- Impeccable: product-register design, restrained color strategy, design tokens, and no nested cards.
- Taste Skill: dashboard-appropriate density, responsive states, and avoiding landing-page effects for product UI.
