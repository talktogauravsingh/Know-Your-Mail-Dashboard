---
name: Premium SaaS Frontend Design
description: A comprehensive guide and structural pattern library for building high-end, light-themed SaaS web applications using React and Tailwind CSS, inspired by modern analytics platforms.
---

# Premium SaaS Frontend Design Skill

When tasked with building a "premium", "modern", or "high-end SaaS" frontend, utilize this skill to apply strict architectural and aesthetic principles that result in a polished, vibrant, and engaging user experience.

## 1. Core Technology Stack
- **Framework**: React (often integrated via Vite into frameworks like Laravel or Next.js).
- **Styling**: Tailwind CSS.
- **State Management**: `Zustand`.
- **Iconography**: `lucide-react`.
- **Class Composition**: `clsx` and `tailwind-merge` (the `cn()` utility pattern).
- **Data Visualization**: `recharts` (customized for minimalism and vibrant accents).

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

## 3. Aesthetic Principles (Modern Light & Airy Style)
1. **Color Palette**: 
   - **Backgrounds**: Use a very light, soft mint/green-tinted off-white (`#eef6f0` or `bg-[#eef6f0]`) for the main app background to create a fresh, airy feel.
   - **Surfaces**: Use stark white (`bg-white`) for sidebar, cards, and primary containers.
   - **Text**: Use deep, high-contrast greens or charcoal/black (`text-slate-900` or `text-[#1a4331]` for headings, `text-slate-500` for secondary text).
   - **Accents**: Use vibrant colors sparingly for data visualization and primary actions. For primary buttons, **ALWAYS use `#234e44`** (Deep Teal/Pine Green) for the background. Secondary vibrant accents include vibrant green (`#10b981`), soft orange/coral (`#ff7a59`), soft yellow for highlights (`#fef3c7`), and soft pink for distinct elements (`#fce7f3`).
   - **Active States**: Use a soft, saturated pastel color for active sidebar items (e.g., a soft green `bg-[#d2f4d6]` with bold text).
   - **IMPORTANT RESTRICTION**: NEVER use purple, violet, or indigo shades anywhere in the design. These colors conflict with the brand identity.
2. **Borders & Elevation**:
   - Favor extremely subtle drop shadows (`shadow-[0_8px_30px_rgb(0,0,0,0.04)]` or `shadow-sm`) over visible borders to create a floating effect for cards.
   - Use rounded corners generously: `rounded-2xl` or `rounded-xl` for cards, `rounded-lg` or `rounded-full` for badges and buttons.
3. **Typography**:
   - Rely on a clean, modern sans-serif (Inter, Roboto, Outfit).
   - Ensure clear hierarchy with bold headings and distinct font weights.
4. **Interactivity**:
   - **IMPORTANT:** ALL Calls to Action (CTAs), buttons, links, and interactive elements MUST have the `cursor-pointer` class applied to signify interactivity with a mouse event pointer.
5. **Dark Mode**:
   - *Note:* This specific aesthetic prioritizes a brilliant light mode. Dark mode should invert elegantly using deep, rich greens or slate, but the default should be the light, airy theme.

## 4. Reusable UI Primitives
Avoid raw HTML styling in pages. Build these components in `components/ui/` first:

- **Button**: Requires variants (`default` (dark green), `outline`, `secondary` (soft green), `ghost`). Generous padding and fully rounded (`rounded-full`) or highly rounded (`rounded-lg`) edges.
- **Card**: Compound component containing `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`. Essential for layout consistency. Must have white background and soft shadows.
- **Badge**: Pill-shaped (`rounded-full`), usually with a pale background and darker text (e.g., `bg-green-100 text-green-700` for positive trends).
- **Input/Select**: Very subtle borders, rounded edges, and distinct focus states.

## 5. Micro-Interactions & Animations
- Apply standard transitions to interactive elements: `transition-all duration-200 ease-in-out`.
- Scale effects on hover for buttons or interactive cards: `hover:scale-[1.02] active:scale-95`.
- Subtle fade-in animations for page loads.

## 6. Page Layout Structure
- **Dashboard Layouts**: Utilize a clean sidebar structure (white background) with a distinct, subtle logo area. The main content area should have the soft, airy background.
- **Top Header**: Integrate a global search bar and user profile/notification icons cleanly into the main content's top header area.
- **Grid Layouts**: Use CSS Grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) for metric cards.
- **Charts**: Use `recharts` to create clean, borderless charts with gradient fills or rounded bars.

## 7. Next Steps Workflow
When starting a new project using this skill:
1. Initialize dependencies (`lucide-react`, `clsx`, `tailwind-merge`, `recharts`).
2. Write the `lib/utils.js` utility helper.
3. Scaffold `components/ui/*` (Button, Card, Badge).
4. Build the core layout wrapper (`AppLayout`) with the sidebar and header.
5. Construct individual view pages sequentially using only the generated primitives.
