# AGENTS.md

This file is the operating manual for every AI model or developer working on this Shopify theme.

The project goal is to produce a production-grade, modern, reusable Shopify Online Store 2.0 theme that can be sold commercially or used internally across multiple stores. All work must preserve Shopify standards, performance, accessibility, merchant editability, and the project's Horizontal Architecture based on Theme Blocks.

## Mandatory First Step

When working with Liquid themes, call `learn_shopify_api` exactly once before making technical decisions, if that tool is available in the current environment.

If the tool is not available, state that it is unavailable and continue using the rules in this file, Shopify Theme Check, and local project context.

## Product Standards

Every change must support these standards:

- Production-ready: no demo widgets, no debug UI, no console logging, no placeholder content in production paths.
- Shopify-compliant: pass `shopify theme check` before deployment.
- Horizontal Architecture: sections provide layout and context; Theme Blocks provide reusable merchant-editable features.
- Merchant-first: features must be configurable from the theme editor without requiring code edits.
- Reusable: prefer snippets, blocks, and scoped section logic over page-specific duplication.
- Performant: load only what is needed, avoid remote runtime dependencies, avoid unnecessary global CSS/JS.
- Accessible: keyboard support, semantic HTML, visible focus states, correct ARIA only where it helps.
- Internationalized: all user-facing text must use locale keys unless it is merchant-provided content.
- Maintainable: small components, clear setting names, stable schema, no unrelated refactors.

## Architecture

### Directory Roles

```text
assets/     Static assets served by Shopify CDN. Keep global assets minimal.
blocks/     Reusable Theme Blocks, merchant-editable, nestable where appropriate.
config/     Global theme settings and persisted theme editor data.
layout/     Top-level HTML shells. Keep layout lean and free of feature UI.
locales/    Translation and theme editor strings.
sections/   Page-level structural modules. Prefer layout/context over feature logic.
snippets/   Reusable Liquid fragments that are not directly merchant-managed.
templates/  JSON templates that compose sections and blocks.
```

### Sections

Sections are structural wrappers and page-level modules.

Rules:

- Include a `{% schema %}` block.
- Use `{% content_for 'blocks' %}` when the section supports Theme Blocks.
- Allow reusable Theme Blocks with:

```json
"blocks": [
  {
    "type": "@theme"
  }
]
```

- Allow app blocks only when there is a real app extension use case:

```json
"blocks": [
  {
    "type": "@app"
  }
]
```

- Do not use large `case block.type` render switches for new horizontal sections.
- Keep page-specific section CSS/JS scoped to the section using `{% stylesheet %}` and `{% javascript %}` when practical.
- Do not put permanent feature UI directly in `layout/theme.liquid`.

### Theme Blocks

Blocks are reusable merchant-editable components in `blocks/`.

Rules:

- Blocks are Theme Blocks, not app blocks.
- Never add `"target": "section"` to files in `blocks/`.
- Every merchant-addable block must include `presets`.
- Use settings for merchant-editable content, layout, behavior, and visibility.
- Use block settings, not hardcoded copy, for content that merchants should control.
- Blocks that are statically rendered with `{% content_for 'block', ... %}` must start with LiquidDoc.
- Blocks may include `{% stylesheet %}` and `{% javascript %}` for component-scoped assets.
- Avoid assuming a global object unless the block is documented for that context, such as `product` inside product templates.

Minimal block schema:

```liquid
{% schema %}
{
  "name": "Product title",
  "settings": [],
  "presets": [
    {
      "name": "Product title"
    }
  ]
}
{% endschema %}
```

### Snippets

Snippets are reusable Liquid fragments rendered with `{% render %}`.

Rules:

- Snippets with parameters must start with LiquidDoc.
- Snippets must not depend on local variables from the caller unless those values are passed explicitly.
- Prefer snippets for repeated markup, formatting, image rendering, price display, icons, and forms.
- Do not use the deprecated `include` tag.

LiquidDoc example:

```liquid
{% doc %}
  Renders a responsive image.

  @param {image} image - Image to render
  @param {string} [class] - Optional CSS class

  @example
  {% render 'responsive-image', image: product.featured_image %}
{% enddoc %}
```

### Layout

`layout/theme.liquid` must remain minimal.

Allowed:

- HTML shell
- meta tags
- `{{ content_for_header }}`
- critical global CSS variables
- minimal global JS required by all pages
- global header/footer section groups
- `{{ content_for_layout }}`

Not allowed:

- Demo widgets
- Page-specific modals
- Fixed promotional UI
- Remote framework scripts
- Debug scripts
- Inline feature CSS

## CSS Standards

Prefer this order:

1. Component-scoped `{% stylesheet %}` in sections, blocks, and snippets.
2. Asset CSS loaded only by the section/snippet/block that needs it.
3. Global CSS in `assets/base.css` only for reset, tokens, typography, layout primitives, and truly shared utilities.

Rules:

- For single CSS property settings, use CSS variables.
- For multi-property design variants, use classes.
- Avoid large global selectors for component-specific UI.
- Do not add inline styles except for setting CSS variables from schema values.
- Keep responsive behavior explicit and test mobile first.
- Preserve visible focus states.
- Avoid one-off utility sprawl.

Example:

```liquid
<div class="feature-grid" style="--feature-grid-gap: {{ section.settings.gap }}px">
  {% content_for 'blocks' %}
</div>

{% stylesheet %}
  .feature-grid {
    display: grid;
    gap: var(--feature-grid-gap);
  }
{% endstylesheet %}
```

## JavaScript Standards

Prefer small, progressive enhancement scripts.

Rules:

- No `console.log`, `debugger`, `alert`, or demo-only code in production.
- No remote runtime dependencies unless explicitly approved.
- Serve third-party libraries from Shopify CDN through `assets/` when they are necessary.
- Load scripts only where needed.
- Use `defer` for asset scripts.
- Keep cart, product form, variant, media gallery, and predictive search behavior compatible with Dawn patterns unless intentionally refactored.
- Support section reloads in the theme editor.
- Avoid global state unless it is a documented theme API.

## Alpine.js Strategy

Alpine.js is allowed only as a lightweight progressive enhancement layer.

Good use cases:

- Local UI state such as tabs, accordions, disclosure panels, popups, simple filters, and option toggles.
- Self-contained blocks or sections with limited state.

Avoid Alpine for:

- Cart orchestration
- Product form submission
- Variant availability logic
- Media gallery state
- Predictive search internals
- Any feature already handled well by existing custom elements

Rules:

- Do not load Alpine from a public CDN in production.
- If used, add a pinned version to `assets/` and load it through `asset_url`.
- Do not load Alpine globally unless multiple above-the-fold/global components require it.
- Prefer section/block-gated loading.
- Do not mix Alpine state with Dawn custom elements in ways that create competing sources of truth.
- Do not leave Alpine demo widgets in the theme.

## Liquid Standards

Rules:

- Use `{% render %}`, not `{% include %}`.
- Do not use unsupported parentheses in Liquid conditions.
- Do not use ternary expressions; Liquid does not support them.
- Use nested `if` conditions when more than one logical operator would make intent unclear.
- Avoid overriding Shopify global object names such as `product`, `cart`, `collection`, `settings`, `routes`, `section`, and `block`.
- Escape merchant-entered plain text with `escape`.
- Use `t` filter for static user-facing copy.
- Use `image_url` and `image_tag` for responsive Shopify images.
- Use `paginate` for collections larger than Liquid loop limits.
- Keep Liquid loops bounded and predictable.

## Schema Standards

Every schema must be valid JSON inside `{% schema %}`.

Rules:

- Setting IDs must be stable once released.
- Use clear labels and translation keys for public/theme-editor text.
- Use `range` for numeric values.
- Use `select` for layout variants.
- Use `checkbox` for binary options.
- Use `color_scheme` instead of hardcoded palette settings where possible.
- Use `image_picker`, `video`, `page`, `collection`, `product`, and `url` input types for merchant-managed content.
- Avoid settings that expose raw CSS or unsafe HTML unless the feature is explicitly a custom-liquid/code feature.
- Use schema defaults that produce a polished first install.

## Templates

JSON templates should compose sections and blocks.

Rules:

- Keep templates merchant-editable.
- Do not hardcode content that should be part of settings or locale files.
- Use stable section and block IDs where possible.
- Product, collection, cart, page, blog, and article templates must remain usable after a clean install.

## Internationalization

Rules:

- All static storefront copy must be in `locales/*.json`.
- All theme editor labels and info text must be in `locales/*.schema.json` unless the project intentionally uses English-only schema during early development.
- Add or update at least `locales/en.default.json` and `locales/en.default.schema.json` for new keys.
- Do not hardcode Vietnamese, English, or emoji text into production UI.
- Keep translation keys organized by section/block/component.

## Accessibility

Minimum requirements:

- Correct heading order within each section.
- Buttons for actions; links for navigation.
- Form controls have labels or accessible names.
- Modals trap focus, close with Escape, and restore focus.
- Drawers and popups use correct `aria-modal`, `aria-expanded`, and `aria-controls` where applicable.
- Interactive elements are keyboard reachable.
- Images have meaningful alt text or empty alt for decorative images.
- Color choices meet contrast requirements.
- Motion respects reduced motion preferences.

## Performance Requirements

Before considering work production-ready:

- Remove unused scripts and styles.
- Avoid loading feature assets globally.
- Keep render-blocking assets minimal.
- Use Shopify image transformations with explicit widths.
- Lazy-load non-critical images.
- Preload only critical fonts/assets.
- Avoid remote CSS/JS assets.
- Avoid layout shifts by defining image dimensions/aspect ratios.
- Avoid duplicate asset loading inside loops.
- Keep JavaScript resilient if sections are re-rendered in the theme editor.

## UI/UX Requirements

The theme should feel modern, calm, commercially useful, and adaptable.

Rules:

- Build real commerce experiences, not marketing placeholders.
- Prioritize clear product discovery, product detail confidence, cart clarity, and checkout path.
- Keep settings flexible without overwhelming merchants.
- Provide polished defaults for first install.
- Ensure all core pages work on mobile.
- Avoid fixed overlays unless they are part of a merchant-controlled feature.
- Avoid in-app text explaining implementation details.
- Keep visual design system consistent across sections and blocks.

## Validation Checklist

Run these checks before handoff when possible:

```bash
shopify theme check
```

Also inspect:

- No remote production assets unless approved.
- No console/debug output.
- No demo UI.
- No hardcoded user-facing strings outside locales.
- No schema JSON errors.
- No missing `presets` for merchant-addable blocks.
- No `"target": "section"` in Theme Blocks.
- No layout-level feature UI.
- Product, collection, cart, search, page, article, blog, and customer templates still render.

## Git and Change Scope

Rules:

- Keep changes scoped to the requested task.
- Do not revert user changes unless explicitly asked.
- Do not rewrite generated `settings_data.json` or templates unless the task requires it.
- Do not make broad formatting-only changes in unrelated files.
- Document production-impacting decisions in README or comments only when useful.

## Release Readiness

A theme is release-ready only when:

- `shopify theme check` passes with zero unapproved warnings.
- Core templates are manually smoke-tested.
- Theme editor add/reorder/remove flows work for new sections and blocks.
- No demo/test assets are visible to customers.
- All required locale keys exist.
- Performance regressions are understood and accepted.
- Accessibility basics are verified.
