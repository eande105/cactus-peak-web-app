# Graphical install (dry run)

Nothing was written. Install would rewrite 1 source files and write the project files in `graphical`.

## Use sites

| Family | Rewritten | Removed | Skipped | Tokens | Kept | Preserved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| border-width | 0 | 0 | 0 | 0 | 0 | 6 |
| color | 0 | 0 | 0 | 4 | 14 | 514 |
| font-family | 0 | 0 | 0 | 0 | 0 | 6 |
| font-size | 3 | 0 | 0 | 0 | 0 | 4 |
| font-weight | 3 | 0 | 0 | 76 | 0 | 2 |
| letter-spacing | 6 | 0 | 0 | 0 | 0 | 0 |
| line-height | 0 | 0 | 0 | 0 | 3 | 5 |
| radius | 2 | 0 | 0 | 0 | 0 | 0 |
| shadow | 0 | 0 | 0 | 0 | 5 | 10 |
| spacing | 1 | 0 | 0 | 0 | 0 | 4 |
| token | 2 | 0 | 0 | 0 | 0 | 0 |

Removed: line heights and tracking a text style carries instead. Tokens: uses of the app’s own tokens, such as `bg-background`, which follow the token once it aliases a Graphical one, and classes that already have Graphical’s name, such as `font-medium`. Kept: values the conversion keeps as authored. Preserved: values the analysis preserved, such as content colors, artwork, state recipes and dynamic values.

## Units

| Family | Values | Units | Multiples | Kept |
| --- | ---: | ---: | ---: | ---: |
| Colors | 19 | 16 | 0 | 0 |
| Text sizes | 3 | 3 | 0 | 0 |
| Font weights | 4 | 3 | 0 | 0 |
| Letter spacing | 3 | 3 | 0 | 0 |
| Corners | 4 | 4 | 0 | 0 |

## Style coverage

- `lib/fonts.ts:13`: Cannot resolve class helper Inter. Include its source or convert and review this class expression manually. Reviewed: next/font loader calls, not class lists. (line 13)
- `lib/fonts.ts:7`: Cannot resolve class helper Archivo. Include its source or convert and review this class expression manually. Reviewed: next/font loader calls, not class lists. (line 7)
- `lib/utils.ts:27`: Cannot resolve class helper merge. Include its source or convert and review this class expression manually. Reviewed: The merge call inside cn(); cn's own arguments are traced. (line 27)
- `components/kit/ui.tsx:389`: Cannot resolve class helper CATEGORIES.map. Include its source or convert and review this class expression manually. Reviewed: CATEGORIES.map() lists the category ids for a hue lookup, not a class list. (line 389)

## Skipped sites

None.

## Text style overrides

3 already present in source; 3 retained during this conversion.

These stay beside their text style, so the inspector shows each as an override of it.

- `app/globals.css:412` `letter-spacing: var(--tracking-l);` on Body S: a value kept as authored
- `app/globals.css:504` `letter-spacing: var(--tracking-s);` on Body L: a value kept as authored
- `app/globals.css:532` `letter-spacing: var(--tracking-s);` on Display XXS: a value kept as authored
- `components/kit/ribs.tsx:233` `leading-none` on Body XL: leading that sets a box’s height
- `components/kit/ribs.tsx:259` `leading-none` on Display S: leading that sets a box’s height
- `components/kit/ribs.tsx:304` `leading-none` on Display S: leading that sets a box’s height

## Kept values

None.

## Left to the agent

- Load `graphical/generated/theme.css` before the app’s styles. Install rewrote the token definitions written in CSS as aliases. Semantic names such as `bg-background` stay as aliases.
- Import `graphical/generated/tailwind-theme.css` right after `@import "tailwindcss"`.
- Resolve the skipped sites, install the theme’s fonts and mount the editor.
- Check the running app. This report and `graphical-install --check` read source, so they show the conversion is complete, not that the app runs. Load the home page and one other page with the dev server: each renders with the editor mounted, and the browser console and the framework’s error overlay show no errors. A page can answer HTTP 200 while a client error stops the editor from loading.
