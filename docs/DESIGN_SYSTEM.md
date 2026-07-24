# Design System: Labyrinth V2 (Project Phoenix)

This document defines the visual layout guidelines, typographic hierarchy, color systems, and animation guidelines for the redesigned browser game.

## Visual Archetype: Sleek Desktop in the Browser
The design system takes cues from high-performance desktop tools (Linear, Raycast, Apple Sonama), utilizing space, glassmorphism, subtle micro-animations, and minimal borders to create a calm, professional experience.

---

## 🎨 Color Palette

### 🟢 Base Colors (Dark Theme First)
- **Background**: `stone-950` (#0c0a09) — Neutral deep slate.
- **Surface**: `stone-900` (#1c1917) — Raised panels and cards.
- **Muted Surface**: `stone-900/50` — Secondary list elements.
- **Borders**: `stone-800` (#292524) — Clean, thin hairline boundary.
- **Foreground Text**: `stone-50` (#fafaf9) — High contrast text.
- **Muted Text**: `stone-400` (#a8a29e) — Secondary description text.

### 🟡 Brand & Accent Theme Tint
- **Default Theme Color**: Amber Orange (`#f59e0b`).
- Custom accent colors can be specified in settings (synchronized into CSS variables `--theme-color`, `--theme-color-rgb`, and `--theme-glow`).

---

## 📐 Spacing & Layout
- **The 70% Board Rule**: The Labyrinth board occupies ~70% of the desktop viewport space. Side panels split the remaining 30%.
- **Borders**: Always `1px` width using `--color-border` (`stone-800`). Avoid heavy dividers.
- **Border Radius**: Use `0.75rem` (`rounded-xl`) for panel containers and cards; `0.5rem` (`rounded-lg`) for buttons and small badges.

---

## ✍️ Typography
- **Primary Font**: Inter / system-ui (clean, readable interface elements).
- **Display Font**: Outfit / system-ui (headers and titles).
- **Line Heights**: Relaxed line spacing for text descriptions; tight heights for compact metrics cards.

---

## 🎭 Animations & Transitions
- **Hover effects**: Translate up by `1px` with a subtle glow increase.
- **Slide animations**: Smooth translations when inserting the spare tile.
- **Pawn movement**: Fast, snappy cubic-bezier offsets (`cubic-bezier(0.16, 1, 0.3, 1)`) to avoid trailing delays.
- **Spring parameters**: `stiffness: 300, damping: 30` for interactive overlays.
