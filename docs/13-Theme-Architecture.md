# BillNova — Theme System Architecture (Deliverable 1)

Light / Dark / System theme with a premium animated Sun·Moon toggle.
**Status:** architecture only — awaiting approval before Provider setup (Deliverable 2).

---

## 1. Current state (why this is a refactor, not just a toggle)

The app is **dark-only today**:
- `index.css` `:root` holds hardcoded **dark** token values (navy `--background`, etc.). There is no light set.
- Many components use **literal dark utilities** instead of tokens: `bg-white/5`, `text-white`, `border-white/10`, `text-indigo-300`, the navy `AmbientBackground`, glass cards (`bg-white/[0.04]`), and **hardcoded Recharts colors** (`#94a3b8`, tooltip `#0a1330`).

A working light mode therefore requires (Deliverable 6) converting those literals to **theme-aware** styles. This doc defines the strategy so that conversion is mechanical and safe.

## 2. Strategy — class-based theming on `<html>`

- Tailwind is already `darkMode: ["class"]`. We drive the theme by toggling a class on `document.documentElement`.
- **Restructure tokens:** `:root` becomes the **Light** ("Professional") palette; `.dark` becomes the **Dark** ("Luxury") palette. Everything that reads `hsl(var(--token))` flips automatically.
- **Resolved theme** is always `light` or `dark`. `system` resolves via `matchMedia('(prefers-color-scheme: dark)')`.

### Token plan (`index.css`)
| Token | Light `:root` | Dark `.dark` |
|-------|---------------|--------------|
| `--background` | `#F8FAFC` (210 40% 98%) | `#050B2B` (225 72% 6%) |
| `--card` | `#FFFFFF` | `224 47% 11%` |
| `--card-foreground` / `--foreground` | slate-900 | slate-100 |
| `--primary` | `#4F46E5` | `#4F46E5` (same) |
| `--accent` | `#6366F1` | `#7C3AED` |
| `--muted` / `--muted-foreground` | slate-100 / slate-500 | navy-800 / slate-400 |
| `--border` / `--input` | slate-200 | navy-700 |
| `--ring` | indigo | indigo |

### Component conversion rules (applied in Deliverable 6)
- `bg-white/5`, `bg-white/[0.04]` → `bg-card` or `bg-muted` (or `dark:bg-white/5` if glass is dark-only).
- `text-white` → `text-foreground`; `text-indigo-300` → `text-primary` / `text-indigo-600 dark:text-indigo-300`.
- `border-white/10` → `border-border`.
- **GlassCard:** light = white card + soft shadow (`bg-card shadow-sm border-border`); dark = frosted glass. One component, two looks via `dark:` variants.
- **AmbientBackground:** dark = navy + indigo/violet glows; light = `#F8FAFC` + faint sky-blue/indigo glows. Switch by theme.
- **Recharts:** axis/tooltip colors read from CSS vars (`--muted-foreground`, `--card`) via `getComputedStyle`, or a `useThemeColors()` hook — no hardcoded hex.

## 3. Theme Provider (Deliverable 2 preview)

- `ThemeProvider` (React context) holds `theme: 'light'|'dark'|'system'` and `resolvedTheme: 'light'|'dark'`.
- Persists to `localStorage["billnova-theme"]`.
- On mount and on `setTheme`: compute resolved theme, toggle `.dark`/`.light` on `<html>`, set `color-scheme`.
- Subscribes to `prefers-color-scheme` changes (only acts when `theme==='system'`).
- `useTheme()` hook exposes `{ theme, resolvedTheme, setTheme, toggle }`.

### No-flicker (FOUC prevention)
A tiny **blocking inline script in `index.html` `<head>`** runs before React, reads `billnova-theme` (+ system) and sets the class synchronously, so first paint is already correct on refresh.
```html
<script>
  (function () {
    var t = localStorage.getItem('billnova-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' &&
      matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  })();
</script>
```

## 4. Animated toggle (Deliverable 3 preview)

- **Pill switch 68×36, full radius.** Sliding knob via Framer `layout` + `spring { stiffness: 500, damping: 30 }`.
- **Dark:** navy→indigo gradient track, inner shadow, **Moon** (soft glow, slight rotation), 2–3 twinkling stars.
- **Light:** sky-blue→white gradient, warm glow, **Sun** (golden glow, rotate 180° + gentle pulse), subtle clouds.
- Icon swap via `AnimatePresence` (rotate + scale + glow). `prefers-reduced-motion` → instant swap, no looping anim.
- Placement: **top-right of a new top bar**, before Notifications/Profile (`Theme | Notifications | Profile`); on mobile, inside Settings → Appearance. (Note: the app currently has a sidebar, no top bar — Deliverable 6 adds a slim top bar to the `AppShell`, or we place the toggle in the sidebar footer + Settings. Decision needed.)

## 5. Theme coverage (Deliverable 6)

Apply/verify on: Login, Register, Dashboard (+ charts), POS, Products, Purchases, Inventory, Reports, Subscription, Settings, all Dialogs, Tables, the UsageBanner, and toasts. Acceptance: no element becomes invisible (e.g., white text on white) in either theme.

## 6. Accessibility & performance

- Toggle is a real `<button role="switch" aria-checked aria-label="Toggle theme">`, keyboard-operable (Enter/Space), visible focus ring (`--ring`).
- `prefers-reduced-motion: reduce` disables looping/spring flourishes (instant transitions).
- Background/color transitions: `transition-colors duration-300 ease-in-out` on the root surfaces; avoid transitioning huge trees to keep it snappy.
- No re-render storms: theme lives in a context with a stable value; only the toggle + ambient bg re-render on switch.

## 7. Open decisions

1. **Toggle placement:** add a slim **top bar** to `AppShell` (matches the brief's "top-right, before Notifications"), or place the toggle in the **sidebar footer + Settings → Appearance**? (No notifications/profile menu exists yet — recommend: sidebar footer + Settings now; top bar when Notifications/Profile are built.)
2. **Default theme:** `system` (recommended) vs `dark` (current look).
3. Light-mode glass treatment: solid white cards w/ shadow (recommended) vs translucent.

---

> **STOP — Deliverable 1 (Theme Architecture).** Approve (and answer the 3 open decisions, or say "use recommended") to proceed to **Deliverable 2: Theme Provider Setup**.
