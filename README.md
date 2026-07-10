# Shopify Production Theme

This project is a production-oriented Shopify Online Store 2.0 theme based on Dawn 15.5.0 and evolved toward a reusable Horizontal Architecture using Theme Blocks.

The goal is to build a modern, high-performance, merchant-friendly theme that can be sold commercially or reused internally across multiple Shopify stores.

## Goals

- Production quality for real stores, not a demo theme.
- Strong Shopify compatibility and clean Theme Check results.
- Horizontal Architecture: reusable blocks, lean sections, editable JSON templates.
- Fast storefront performance with minimal global CSS and JavaScript.
- Accessible, responsive, polished UX across core commerce flows.
- Easy extension by developers and AI agents without breaking architecture.
- Safe foundation for optional Alpine.js enhancements.

## Architecture

The theme is organized around sections, Theme Blocks, snippets, and JSON templates.

```text
assets/     Static CSS, JS, SVG, image, and library files served by Shopify CDN
blocks/     Reusable merchant-editable Theme Blocks
config/     Global settings schema and theme editor data
layout/     Top-level HTML shells
locales/    Storefront and theme editor translations
sections/   Structural page modules
snippets/   Reusable Liquid fragments
templates/  JSON templates composing sections and blocks
```

## Horizontal Architecture Rules

Sections should provide layout and context. Theme Blocks should provide reusable features.

A section that supports Theme Blocks should render:

```liquid
{% content_for 'blocks' %}
```

and include:

```json
"blocks": [
  {
    "type": "@theme"
  }
]
```

Theme Blocks in `blocks/` must:

- Include `presets` so merchants can add them in the theme editor.
- Never use app block schema such as `"target": "section"`.
- Keep merchant-facing settings in schema.
- Use scoped `{% stylesheet %}` and `{% javascript %}` when practical.
- Use LiquidDoc when statically rendered or when parameters/context need documentation.

## Production Standards

The theme should not contain:

- Demo widgets
- Debug UI
- `console.log`, `debugger`, or `alert`
- Remote runtime scripts
- Hardcoded storefront copy outside locale files
- Large page-specific UI inside `layout/theme.liquid`
- Unused assets loaded globally

The theme should contain:

- Polished default templates
- Mobile-first responsive layouts
- Accessible forms, drawers, modals, and controls
- Locale-backed storefront text
- Predictable schema settings
- Shopify CDN-served assets
- Clear component ownership

## CSS and JavaScript

Prefer component-scoped CSS and JavaScript:

- Use `{% stylesheet %}` and `{% javascript %}` in sections, blocks, and snippets where appropriate.
- Keep `assets/base.css` for global foundations only.
- Load feature assets only where the feature appears.
- Avoid inline styles except for CSS custom properties generated from schema settings.
- Avoid remote CSS and JS in production.

For single-property settings, map schema values to CSS variables:

```liquid
<div class="grid" style="--grid-gap: {{ section.settings.gap }}px">
```

For multi-property variants, use classes:

```liquid
<div class="media media--{{ section.settings.layout }}">
```

## Alpine.js Direction

Alpine.js may be used as a small progressive enhancement layer, but it is not the primary application framework.

Recommended use cases:

- Tabs
- Accordions
- Disclosure panels
- Simple popups
- Local UI toggles
- Lightweight block-level interactions

Avoid using Alpine.js for:

- Cart orchestration
- Product form submission
- Variant availability
- Media gallery state
- Predictive search internals
- Any behavior already owned by Dawn custom elements

Production rules:

- Do not load Alpine.js from a public CDN.
- If Alpine.js is used, pin a version in `assets/` and serve it through `asset_url`.
- Prefer loading Alpine.js only on sections/templates that need it.
- Do not leave Alpine demo UI in the theme.

## Validation

Run Theme Check before handoff or deployment:

```bash
shopify theme check
```

Minimum release checks:

- Theme Check has zero unapproved warnings.
- Core templates render: home, product, collection, cart, search, page, blog, article, customer pages.
- Theme editor can add, remove, reorder, and configure new sections/blocks.
- No demo UI is visible.
- No remote runtime dependency is loaded.
- No production console output remains.
- User-facing copy is translated through locales.
- Mobile product discovery, product detail, and cart flows are usable.

## Development Workflow

Use Shopify CLI for local development:

```bash
shopify theme dev
```

Use Theme Check for linting:

```bash
shopify theme check
```

Recommended review flow:

1. Identify the target section, block, snippet, or asset owner.
2. Preserve existing Dawn-compatible behavior unless intentionally changing it.
3. Add merchant settings only where they create real flexibility.
4. Keep CSS/JS scoped and lazy where possible.
5. Run validation.
6. Document architectural decisions when they affect future work.

## Current Priorities

1. Remove any demo-only UI from layout and storefront paths.
2. Replace remote runtime scripts with Shopify CDN-served assets or remove them.
3. Continue moving reusable UI into Theme Blocks.
4. Reduce global CSS/JS and load feature assets closer to the component.
5. Strengthen LiquidDoc and locale coverage.
6. Keep Alpine.js optional, scoped, and production-safe.

## AI and Developer Guidance

`AGENTS.md` is the authoritative implementation guide for AI models and developers. Any model contributing code should read it before making changes.

The short version:

- Build for production.
- Keep the theme merchant-editable.
- Preserve Horizontal Architecture.
- Favor reusable blocks and snippets.
- Keep layout lean.
- Avoid remote dependencies.
- Validate with Shopify Theme Check.
