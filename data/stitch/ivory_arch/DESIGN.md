# Design System Strategy: The Curated Workspace

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Atelier."** 

Standard knowledge bases often feel like rigid filing cabinets—functional but sterile. This system rejects that clinical coldness in favor of an editorial, high-end studio aesthetic. Inspired by the precision of Apple and the structural flexibility of Notion, "The Digital Atelier" treats information as art. We move beyond the "template" look by utilizing intentional asymmetry, expansive whitespace, and a sophisticated layering of monochromatic tones. The goal is to create a space that feels quiet, allowing the user's thoughts and content to provide the only necessary "noise."

---

## 2. Colors & Surface Architecture
Our palette is a study in restrained neutrals. By moving away from vibrant accents, we focus the user's eye on the hierarchy of information.

### The "No-Line" Rule
To achieve a premium, seamless feel, **1px solid borders are prohibited for sectioning.** Do not use lines to separate a sidebar from a main content area. Instead, boundaries must be defined solely through background color shifts. For example, a navigation sidebar should use `surface_container_low` (#f2f4f6) against a main content area of `surface` (#f9f9fb).

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine vellum.
- **Base Layer:** `surface` (#f9f9fb)
- **Secondary Sectioning:** `surface_container_low` (#f2f4f6)
- **Primary Content Containers:** `surface_container_lowest` (#ffffff)
- **Interactive/Hover States:** `surface_container_high` (#e4e9ee)

### The "Glass & Gradient" Rule
To prevent the UI from feeling "flat" or "cheap," use Glassmorphism for floating elements (like popovers or sticky headers). Use `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur. For primary CTAs, avoid flat gray; use a subtle linear gradient from `primary` (#5f5e60) to `primary_dim` (#535254) to provide a "metallic" weight and professional polish.

---

## 3. Typography: The Editorial Voice
We use a single typeface—**Inter**—but we vary its application to create a sense of scale and authority.

| Level | Token | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | 3.5rem | 600 | 1.1 | Hero headers, landing moments. |
| **Headline**| `headline-md`| 1.75rem| 600 | 1.2 | Main article titles. |
| **Title**   | `title-md`   | 1.125rem| 500 | 1.4 | Section headers within articles. |
| **Body**    | `body-lg`    | 1rem   | 400 | 1.6 | Primary reading text. |
| **Label**   | `label-md`   | 0.75rem| 500 | 1.0 | Metadata, tags, overlines. |

**The Typography Philosophy:** Use `on_surface` (#2d3338) for almost everything. Reserve `on_surface_variant` (#596065) only for secondary metadata. The high contrast between large, bold headlines and generous body leading (1.6) creates an "Architectural Digest" feel.

---

## 4. Elevation & Depth
In this system, depth is felt, not seen. We avoid heavy shadows in favor of **Tonal Layering.**

*   **The Layering Principle:** Place a `surface_container_lowest` (#ffffff) card on top of a `surface_container` (#ebeef2) background. The 4% difference in brightness creates a sophisticated "lift" that is more modern than a shadow.
*   **Ambient Shadows:** For floating modals, use an ultra-diffused shadow: `0 20px 40px rgba(45, 51, 56, 0.04)`. The shadow color is a tinted version of `on_surface`, ensuring it looks like natural light hitting a surface.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility in input fields, use `outline_variant` at **20% opacity**. Never use a 100% opaque border; it breaks the "Atelier" softness.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_dim`, `on_primary` text, `xl` (12px) radius. No border.
*   **Secondary:** `surface_container_highest` background, `on_surface` text.
*   **Tertiary:** Transparent background, `primary` text. Underline only on hover.

### Cards & Lists
**Strict Rule:** No divider lines (`<hr>`). Separate list items using the `3` (1rem) spacing token. If items need more distinction, use a subtle background shift to `surface_container_lowest` on hover.

### Input Fields
Soft, pill-shaped or `xl` (12px) rounded corners. Use `surface_container_low` as the base fill. On focus, transition the background to `surface_container_lowest` and add a 1px "Ghost Border" using `primary` at 20% opacity.

### The "Knowledge Node" (Custom Component)
A specialized card for the knowledge base. Features a `label-sm` category at the top, a `title-lg` heading, and a `body-md` snippet. It sits on `surface_container_lowest` with an `xl` corner radius and no border, using only a subtle ambient shadow on hover to signal interactivity.

---

## 6. Do’s and Don’ts

### Do
*   **Embrace Asymmetry:** Align your main content container 1/3 from the left to create a sophisticated, editorial negative space.
*   **Use Spacing as a Divider:** Use the `8` (2.75rem) or `10` (3.5rem) spacing tokens to separate major content blocks instead of lines.
*   **Nesting Surfaces:** Use `surface_container_lowest` for the "active" workspace and `surface` for the background.

### Don’t
*   **Don't use pure black:** Use `on_surface` (#2d3338) for text to keep the "calm" personality.
*   **Don't use standard icons:** Use thin-stroke (1px or 1.5px) icons to match the refined typography. Bold icons will feel too "heavy" for this system.
*   **Don't crowd the margins:** In a knowledge base, reading is the priority. Maintain a maximum line width of 720px for all body text to ensure readability.