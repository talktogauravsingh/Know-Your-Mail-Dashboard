# Product Requirements Document (PRD): KnowYourEmail UI/UX Redesign

## 1. Executive Summary
**Objective**: Redesign the frontend UI/UX of the KnowYourEmail dashboard to reflect a premium SaaS aesthetic, inspired by modern design trends, while establishing a unique, copyright-safe brand identity.
**Core Constraint**: This is a **100% frontend initiative**. No backend logic, API endpoints, database schemas, or state management logic will be altered.

---

## 2. Product Strategy (SPM Perspective)

### Brand Positioning
*   **Name**: Transitioning fully to **KnowYourEmail**.
*   **Vibe**: Moving from a "developer utility" look to a "Premium Marketing Intelligence Platform".
*   **Differentiation**: To avoid copyright issues and "copycat" aesthetics (e.g., relying on trending lime greens), we are adopting a unique **Cyber Blue & Deep Graphite** visual language. This screams "data-driven," "trustworthy," and "enterprise-ready."

### UX Goals
*   **Enhanced Information Hierarchy**: Use whitespace, soft shadows, and card grouping to make complex analytics easier to digest.
*   **Modern Navigation**: Introduce a sidebar with a prominent Workspace/Profile switcher and clear, categorized navigation links.
*   **Premium Feel**: Replace harsh borders and sharp corners with "soft UI" elements (high border-radius, diffused shadows).

---

## 3. Technical Requirements (Tech Lead Perspective)

### 3.1 Design Tokens (Tailwind CSS)
The `tailwind.config.js` will be the foundation of this redesign.
*   **Primary Color (Cyber Blue)**: A vibrant blue (e.g., Tailwind's `blue-500` or `#3B82F6`) for primary actions and data highlights.
*   **Neutral Palette (Deep Graphite)**: Rich, dark slates (e.g., `slate-900` for text/backgrounds in dark mode) instead of pure black or stark white.
*   **Accent Color (Electric Violet)**: Used sparingly (e.g., `violet-500`) to highlight "AI" or "Premium" features.
*   **Border Radius**: Shift from standard `rounded-md` (6px) to `rounded-2xl` (16px) and `rounded-3xl` (24px) for major containers and cards to achieve the "soft" look.
*   **Typography**: Adopt a modern geometric sans-serif (like Inter or Plus Jakarta Sans). High contrast between bold headings and muted secondary text.

### 3.2 Component Overhauls (Pure UI)
We will touch the UI primitives in `resources/js/src/components/ui/` without altering their functional props.
*   **Cards**: Remove 1px solid borders; replace with subtle borders + diffused drop shadows + large radius.
*   **Buttons**: Thicker padding, fully rounded pills or high-radius rectangles, vibrant hover states.
*   **Badges/Tags**: Soft backgrounds with vibrant text (e.g., light blue background with dark blue text) for statuses.
*   **Charts**: Update Recharts/Chart.js configurations to use the new color palette, rounded bar corners, and custom tooltip styling.

### 3.3 Page-Level Scope
*   **`layouts/DashboardLayout.jsx`**: Complete visual rebuild of the sidebar. Add a mock "Workspace Selector" at the top.
*   **`pages/Dashboard.jsx`**: Reskin the KPI cards and the "Performance Over Time" / "Campaign Performance" charts to match the new high-density, premium look.
*   **Feature Placeholders**: If the new design dictates sidebar items for "Automation" or "AI Chatbot", we will add them to the UI but render them as "Coming Soon" or disabled states to strictly adhere to the "No Backend Changes" constraint.

### 3.4 Constraints & Safety Rules
1.  **Zero API Changes**: All Axios/fetch calls in `api.js` and `useStore.js` remain completely untouched.
2.  **Prop Preservation**: When updating UI components (like `Select` or `Input`), ensure all React `onChange`, `value`, and `ref` props are perfectly preserved so forms don't break.
3.  **State Management**: Zustand store logic remains as-is. We are only changing how the data from the store is rendered.

---

## 4. Execution Plan (Phased Rollout)

*   **Phase 1: The Foundation**
    *   Update `tailwind.config.js` with new colors, fonts, and radius tokens.
    *   Update global CSS (`index.css` or `app.css`).
*   **Phase 2: UI Primitives**
    *   Refactor `Card`, `Button`, `Input`, `Badge` in the `components/ui` folder.
*   **Phase 3: The Shell**
    *   Rebuild `DashboardLayout.jsx` (Sidebar and Header) with the new styling.
*   **Phase 4: The Data Pages**
    *   Apply the new styling to `Dashboard.jsx`, ensuring charts and KPIs look premium.
    *   Cascade styles to `Campaigns.jsx` and `Audience.jsx`.
