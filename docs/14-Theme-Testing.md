# BillNova — Theme System: Testing Instructions (Deliverable 8)

## Where to find the toggle
- **Sidebar footer** (desktop): the animated Sun/Moon pill, labelled "Theme".
- **Settings → Appearance**: Light / Dark / System buttons.

## Functional checks
1. **Toggle switch** — click the pill: knob slides (spring), icon swaps Sun↔Moon, whole app recolors in ~0.3s. No layout jumps.
2. **Persistence** — pick Light, refresh (F5): app stays Light, **no dark flash** on load (inline `<head>` script). Repeat for Dark.
3. **System mode** — Settings → Appearance → System. Change your OS theme (Windows: Settings → Personalization → Colors → Light/Dark); the app follows live without reload.
4. **Storage** — DevTools → Application → Local Storage → key `billnova-theme` is `light` | `dark` | `system`.

## Coverage — verify both themes don't break any screen
Toggle to **Light**, then walk: Dashboard (KPI cards, sales chart, recent bills, tooltips), POS (product tiles, cart, payment, dropdowns), Products (table, edit dialog, margin selling-price box), Purchases (new-purchase dialog, dropdowns), Inventory, Reports (tables + date filters), Subscription, Settings, all dialogs/toasts. Then toggle to **Dark** and repeat.
- ✅ No invisible text (e.g., white-on-white), borders visible, dropdowns readable, charts legible.
- Auth (Login) is intentionally **always dark** (branded); the rest follows the theme.

## Accessibility
- Tab to the toggle → visible focus ring. Press **Space/Enter** → toggles. `role="switch"`, `aria-checked`, `aria-label="Toggle theme"`.
- Enable **Reduce Motion** (OS) → toggle still works but skips looping star/sun animations and springs.

## Performance
- No FOUC on refresh; transition is a CSS `transition-colors` on root surfaces (cheap). Theme lives in one context — only the toggle + ambient backdrop re-render on switch.

## Palettes
- **Light "Professional":** bg `#F8FAFC`, white cards + soft shadows, primary `#4F46E5`, accent `#6366F1`.
- **Dark "Luxury":** bg `#050B2B`, frosted glass cards, primary `#4F46E5`, accent `#7C3AED`, ambient glows.
