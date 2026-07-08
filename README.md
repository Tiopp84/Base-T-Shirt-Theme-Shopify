# Shopify Base Theme (Horizontal Architecture)

This project is a custom Shopify Theme built upon the foundation of Dawn (v15.5.0), heavily refactored to fully embrace the **Shopify Horizontal Architecture (Theme Blocks)**.

Unlike older architectures where sections control their nested blocks via static switch statements (`case block.type`), this theme separates concerns: Sections provide the layout and context, while reusable independent Theme Blocks provide the granular features.

## 🏗 Architecture Overview

### 1. Sections (`/sections`)
Sections in this theme primarily act as structural wrappers.
- They **do not** manually loop through blocks and check their types.
- They render all child Theme Blocks using the native injection tag: `{% content_for 'blocks' %}`.
- To allow merchants to add Theme Blocks to a section, the section's schema must include:
  ```json
  "blocks": [
    {
      "type": "@theme"
    }
  ]
  ```

### 2. Theme Blocks (`/blocks`)
Functional components (such as `product-title`, `product-price`, `quantity-selector`, `collapsible-tab`, etc.) have been extracted out of `main-product.liquid` into completely independent `.liquid` files living in the `/blocks/` directory.

> **CRITICAL RULE FOR AI & DEVS**: 
> - **DO NOT USE APP BLOCK SCHEMA**: Never add `"target": "section"` to the schema of a file in the `/blocks/` directory. These are Theme Blocks, not App Blocks.
> - **PRESETS ARE MANDATORY**: For a Theme Block to be visible and selectable in the Shopify Theme Editor's "Add block" menu, its `{% schema %}` **must** contain a `"presets"` array. Without `"presets"`, the block can only be rendered if hardcoded in JSON templates, but merchants won't be able to add it manually.

**Example of a valid Theme Block schema (`blocks/product-title.liquid`):**
```liquid
{% schema %}
{
  "name": "Product Title",
  "settings": [],
  "presets": [
    {
      "name": "Product Title"
    }
  ]
}
{% endschema %}

<h1>{{ product.title | escape }}</h1>
```

## 🛠 Developer & AI Guidelines

When writing or modifying code in this project, you **must** adhere to the following rules (also referenced in `AGENTS.md`):

1. **Strict Theme Block Compliance**:
   - Only use valid fields supported by the Shopify Theme Block schema.
   - If a section needs to allow blocks, configure it using `{"type": "@theme"}` in the section schema. 

2. **Styling (CSS) & JavaScript**:
   - Use `{% stylesheet %}` and `{% javascript %}` tags directly inside snippets, blocks, and sections to encapsulate styles and scripts.
   - **Good Practice**: For single-property settings (e.g., `gap`), map them to CSS variables `style="--gap: {{ block.settings.gap }}px"`. For multiple properties, use CSS classes (e.g., `collection--full-width`).

3. **Liquid Syntax & Best Practices**:
   - Use whitespace stripping `{{- ... -}}` and `{%- ... -%}` to avoid excessive spaces in the HTML output.
   - Liquid does not support ternary conditionals. Always use nested `{% if %}` or `{% unless %}` tags.
   - For string logic, use the `contains` operator. Note that `contains` only works with strings, not objects inside arrays.

4. **Component Documentation (LiquidDoc)**:
   - When a block or snippet is rendered statically, include a `{% doc %}` tag at the top of the file documenting its purpose, `@param`, and providing an `@example`.

## ✅ Validation

Always validate your JSON schemas and Liquid files against Shopify's official standards. Since this architecture avoids App Blocks, passing the **Shopify Theme Check** is mandatory before any deployment.

Run the linter locally:
```bash
shopify theme check
```

## 📁 Directory Structure
```
.
├── assets          # Static assets (critical.css, global JS, fonts)
├── blocks          # Modular, reusable Theme Blocks (e.g., product-price.liquid)
├── config          # Global theme settings (settings_schema.json)
├── layout          # Global HTML shells (theme.liquid)
├── locales         # Translations (en.default.json)
├── sections        # Structural wrappers (main-product.liquid)
├── snippets        # Reusable logic / HTML fragments
└── templates       # JSON structures mapping sections & blocks
```

*Built to be lean, functional, and extremely modular. Happy coding!*
