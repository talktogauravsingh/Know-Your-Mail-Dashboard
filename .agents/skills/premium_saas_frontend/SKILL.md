---
name: Premium SaaS Frontend Design
description: A comprehensive guide and structural pattern library for building high-end, Linear/Stripe-style SaaS web applications using React and Tailwind CSS.
---

# Premium SaaS Frontend Design Skill

When tasked with building a "premium", "modern", or "high-end SaaS" frontend, utilize this skill to apply strict architectural and aesthetic principles that result in a polished, distraction-free user experience.

## 1. Core Technology Stack
- **Framework**: React (often integrated via Vite into frameworks like Laravel or Next.js).
- **Styling**: Tailwind CSS.
- **State Management**: `Zustand` (for lightweight, boilerplate-free global state).
- **Iconography**: `lucide-react` (for crisp, consistent stroke-based SVG icons).
- **Class Composition**: `clsx` and `tailwind-merge` (the `cn()` utility pattern).
- **Data Visualization**: `recharts` (customized for minimalism).

## 2. The "cn" Utility Standard
Always create a class-merging utility first to avoid Tailwind specificity conflicts in reusable components.

```javascript
// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

## 3. Aesthetic Principles (Linear/Stripe Style)
1. **Color Palette**: 
   - **Neutrals**: Embrace monochromatic, sophisticated grays (`slate` or `zinc`). Use `slate-900` for primary text and `slate-500` for secondary text to establish strict visual hierarchy.
   - **Accents**: Use deeply saturated primary colors (like `indigo-600` or `violet-600`) sparingly for primary actions (buttons, active states).
   - **Backgrounds**: Use stark white (`bg-white`) for cards and very light off-white (`bg-slate-50`) for the application background.
2. **Borders & Elevation**:
   - Favor extremely subtle borders (`border-slate-200/60` or `border-slate-100`) over heavy drop shadows. 
   - Use `shadow-sm` on cards and inputs, and only elevate to `shadow-md` on hover states.
3. **Typography**:
   - Rely on a clean, modern sans-serif (Inter, Roboto, Geist).
   - Use dense tracking (`tracking-tight`) for large headers (`text-2xl` and above).
4. **Dark Mode Integration**:
   - Use Tailwind's `dark:` variant ubiquitously. 
   - Invert backgrounds logically (`dark:bg-slate-950` for app background, `dark:bg-slate-900` for cards).

## 4. Reusable UI Primitives
Avoid raw HTML styling in pages. Build these components in `components/ui/` first:

- **Button**: Requires variants (`default`, `outline`, `secondary`, `ghost`) and sizes. Should include focus rings (`focus-visible:ring-indigo-500`).
- **Card**: Compound component containing `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`. Essential for layout consistency.
- **Badge**: Tiny, rounded rectangles for status (`bg-emerald-50 text-emerald-700`).
- **Input/Select**: Subtle borders, rounded edges (`rounded-md`), and distinct focus-visible states.

## 5. Micro-Interactions & Animations
UIs should feel fast but smooth. 
- Apply standard transitions to interactive elements: `transition-all duration-200`.
- Use Tailwind animation utilities for page and component mounting without needing full Framer Motion setups:
  - `animate-in fade-in duration-500` for page roots.
  - `slide-in-from-bottom-2` for list item mounting.
- Scale effects on hover for visual interest: `group-hover:scale-105 transition-transform`.

## 6. Page Layout Structure
- **Dashboard Layouts**: Utilize a flexible sidebar structure with a top header for breadcrumbs and user profiles.
- **Content Constraint**: Wrap page content in `max-w-7xl mx-auto`.
- **Vertical Spacing**: Liberally use `space-y-6` or `space-y-8` to ensure sections breathe.
- **Empty States**: Always design beautiful empty states using dashed borders (`border-dashed`), a large centered icon, and a muted helper text.

## 7. Next Steps Workflow
When starting a new project using this skill:
1. Initialize dependencies (`lucide-react`, `clsx`, `tailwind-merge`).
2. Write the `lib/utils.js` utility helper.
3. Scaffold `components/ui/*` (Button, Card, Input, Label, Badge).
4. Build the core layout wrapper (`AppLayout`).
5. Construct individual view pages sequentially using only the generated primitives.
