# TrackX Web Design System

TrackX is a private personal-finance product. The web UI should feel calm, useful, and fast to scan. It should not feel like a marketing site, a generic admin table, or a banking clone.

## Product Shape

Primary job:

```text
I sent expenses in Telegram. Show me if I am okay this week, what needs attention, and what I should fix.
```

Design priorities:

- Weekly awareness before monthly accounting.
- Fast correction before deep analysis.
- Clear risk signals before decorative polish.
- Mobile review as a first-class workflow.
- Private, quiet, low-drama visual language.

## Color Tokens

Use a modern personal-finance palette: white app surfaces, light gray canvas, a bright lime brand accent, deep green primary actions, and charcoal text. Semantic colors should appear only when they carry meaning.

| Token             | Value     | Use                                    |
| ----------------- | --------- | -------------------------------------- |
| `surface`         | `#ffffff` | Main cards, page panels, inputs        |
| `surface-muted`   | `#f1f3f1` | App background, quiet grouped areas    |
| `surface-rail`    | `#e4e8e3` | Progress rails and subtle dividers     |
| `surface-border`  | `#d9dfd6` | Hairline borders                       |
| `surface-inverse` | `#104f23` | Deep green brand frame and actions     |
| `ink`             | `#111813` | Primary text                           |
| `ink-muted`       | `#687069` | Secondary labels and descriptions      |
| `ink-soft`        | `#8b938c` | Tertiary metadata                      |
| `accent`          | `#a9ef63` | Lime brand moments and hero highlight  |
| `accent-muted`    | `#ebffd8` | Active backgrounds and source chips    |
| `accent-dark`     | `#104f23` | Accent text on light backgrounds       |
| `success`         | `#12662e` | Healthy budget state, income           |
| `success-muted`   | `#e6f8df` | Healthy badges                         |
| `warning`         | `#b86d14` | 75% budget usage and watchlist states  |
| `warning-muted`   | `#fff1cf` | Warning backgrounds                    |
| `danger`          | `#c64040` | Destructive action, over-budget state  |
| `danger-muted`    | `#f9e3df` | Destructive or over-budget backgrounds |

Rules:

- Lime should be memorable but controlled; use it for the weekly hero, active state, and small brand moments.
- Deep green is the primary action and trust color.
- Red should not repeat down tables unless the user is actively in a destructive flow.
- Prefer hairline borders and subtle contrast over heavy shadows.

## Typography

Use the system UI stack for now. It is fast, native, and appropriate for a personal tool.

Font family:

```css
ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Optional later upgrade:

- Geist Sans for product polish.
- Geist Mono only for small numeric/debug labels if needed.

Scale:

| Role              | Size             | Weight | Notes                           |
| ----------------- | ---------------- | ------ | ------------------------------- |
| Page title        | `32px` desktop   | `600`  | Use sparingly; no hero scale    |
| Mobile page title | `24px`           | `600`  | Keep compact                    |
| Section title     | `16px`           | `600`  | Dashboard panels and tables     |
| Body              | `14px` or `16px` | `400`  | Use `14px` in dense tables      |
| Metadata          | `12px`           | `500`  | Uppercase only for short labels |
| Numeric stat      | `28px` desktop   | `600`  | Tabular numbers enabled         |
| Button            | `14px`           | `500`  | Avoid oversized buttons         |

Copy rules:

- Prefer `Dashboard`, `Transactions`, `This week`, `This month`, `Needs attention`.
- Avoid repeated product words such as `console`, `cockpit`, and `ledger`.
- Every sentence should help the user decide or act.

## Spacing And Layout

Base spacing unit: `4px`.

Page shell:

- Desktop max width: `1280px`.
- Desktop page padding: `24px`.
- Mobile page padding: `16px`.
- Main vertical section gap: `24px`.
- Dense group gap: `12px`.

Breakpoints:

| View        | Target                                           |
| ----------- | ------------------------------------------------ |
| Mobile      | Single-column review flow                        |
| Tablet      | Two-column dashboard where safe                  |
| Desktop     | Summary top, two-column details                  |
| Wide screen | Keep content centered, no stretch-to-edge tables |

Dashboard layout:

```text
Nav
Header
Native-app summary card
Budget watchlist + month snapshot
Recent transactions
```

Transactions layout:

```text
Nav
Header + count
Filters/search
Grouped transaction review list
Edit drawer or inline editor
```

Settings layout:

```text
Nav
Header
Budget planner
Telegram setup
Profile actions stay in the top account menu
```

## Components

Dashboard-specific composition components live in `apps/web/src/components/dashboard`.
Reusable primitives should stay in `apps/web/src/components` or
`apps/web/src/components/ui`.

### Panels

Use panels for bounded tools, repeated rows, and important summaries.

- Radius: `16px` for panels, `999px` for pills and chips.
- Border: `1px surface-border`.
- Shadow: `0 1px 2px oklch(22% 0.018 95 / 0.06)`.
- Header padding: `12px 16px`.
- Body padding: `16px`.

Avoid:

- Cards inside cards.
- Large decorative card grids.
- Identical cards where a table or grouped list is clearer.

### Buttons

Sizes:

| Size    | Height | Padding     | Use                         |
| ------- | ------ | ----------- | --------------------------- |
| Small   | `32px` | `8px 10px`  | Table actions, chips        |
| Default | `36px` | `10px 12px` | Forms, primary actions      |
| Large   | `44px` | `12px 16px` | Mobile primary actions only |

States:

- Primary: accent background, white text.
- Secondary: surface background, border, ink text.
- Danger: quiet by default where repeated; strong red only inside confirmation or destructive submit.
- Active press: `scale(0.97)`.
- Hover lift: max `translateY(-1px)` and only on hover-capable devices.
- Focus: visible `2px` accent ring.

### Navigation

Desktop:

- Height around `64px`.
- Brand lockup left.
- Primary links right.
- Active link uses `accent-muted`, not a heavy filled button.

Mobile:

- Bottom nav should feel like a floating native tab bar: rounded, translucent, compact, and detached from the page edge.
- Bottom nav contains only primary destinations. Never put logout in the bottom nav.
- Use `Transactions`, not `Ledger`, in user-facing navigation.
- Minimum touch target: `44px`.
- Sign out lives in the top profile menu with Settings.

### Metrics

Metrics should answer a question, not just show a number.

Preferred metrics:

- `This week spent`
- `Budget left`
- `Top category`
- `This month net`

Do not show four equal cards if one metric is clearly more important.
On mobile, prefer one dominant finance card plus compact supporting metrics over a grid of equally weighted cards.

### Budgets

Budget display order:

1. Over budget.
2. 75% or above.
3. Active categories with spending.
4. Quiet categories with no spending.

Budget row anatomy:

```text
Category         Status
€35.29 / €50
progress rail
71% used · €14.71 left
```

Visual treatment:

- `ok`: quiet row, no loud badge needed for every item.
- `warning`: amber rail and watchlist presence.
- `over`: red rail and explicit message.

### Transactions

Transactions should feel like a review queue.

Desktop:

- Keep table density.
- Group by date when possible.
- Amount column right-aligned with tabular numbers.
- Edit should be easier to reach than delete.
- Delete should not be a repeated red block in every row.

Mobile:

- Use cards grouped by date.
- Primary visible details: description, amount, category.
- Secondary details: source, merchant, date.
- Actions should use fixed, stable button sizes.

### Forms

- Labels above inputs.
- Never rely on placeholder as label.
- Error text sits below the field or form group.
- Inputs use `36px` minimum height on desktop, `44px` on mobile.

### Settings

- Budget setup lives on Settings, not Dashboard.
- The budget planner can use AI to suggest category limits, but every suggested
  category amount must remain directly editable before saving.
- Telegram setup belongs on Settings as an integration card.
- Keep Settings task-focused; avoid repeating dashboard metrics there.

## Motion

Motion exists only to show response or state change.

Timing:

- Button/color feedback: `120-150ms`.
- Panel or row state change: `150-200ms`.
- Avoid anything above `300ms`.

Allowed properties:

- `opacity`
- `transform`
- `color`
- `background-color`
- `border-color`

Rules:

- No page-load spectacle.
- No bouncing financial data.
- No animation for high-frequency typing/editing.
- Respect `prefers-reduced-motion`.

## Accessibility

- All interactive controls need visible focus.
- Minimum touch target: `44px` on mobile.
- Color cannot be the only status signal; include labels for warning/over.
- Keep text contrast high on muted backgrounds.
- Tables need readable headers and stable column alignment.

## Verification

Run after visual changes:

```sh
pnpm --filter @trackx/web typecheck
pnpm --filter @trackx/web build
pnpm format:check
git diff --check
```

Visual smoke:

```sh
pnpm web:dev
pnpm exec playwright screenshot --browser=chromium --viewport-size=1440,1000 http://localhost:3000/login /private/tmp/trackx-login-desktop.png
pnpm exec playwright screenshot --browser=chromium --viewport-size=390,844 http://localhost:3000/login /private/tmp/trackx-login-mobile.png
```

For authenticated pages, use manual screenshots or a Playwright auth state once auth test setup exists.
