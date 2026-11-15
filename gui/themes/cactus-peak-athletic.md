# Cactus Peak Athletic

Generated from `graphical/themes/graphical.json` and `graphical/generated/theme.css` by
`graphical/install/write-theme-reference.mjs`. Don't edit it by hand: change the theme, run
`npx graphical-install --theme graphical`, then run the script again.

The theme switches with next-themes' `dark` class on `<html>`. Every variable below is defined at `:root` (light)
and `.dark`. Component assignments for the bundled Base UI components are in
[the assignment tables](cactus-peak-athletic-components.md).

## Fonts

| Role | Family | Regular | Medium | Heavy | Class |
| --- | --- | --- | --- | --- | --- |
| body | `var(--font-inter), system-ui, sans-serif` | 400 | 500 | 600 | `font-body` |
| display | `var(--font-archivo), system-ui, sans-serif` | 500 | 700 | 800 | `font-display` |
| data | `var(--font-archivo), system-ui, sans-serif` | 400 | 500 | 700 | `font-data` |

`--font-inter` and `--font-archivo` come from next/font (lib/fonts.ts). `font-regular`, `font-medium` and
`font-heavy` take the weights of the nearest font class (`.font-display-wide` and `.tabular` set the display
and data weights).

## Colors

| Token | Light | Dark | Class |
| --- | --- | --- | --- |
| `--color-1` | `#b5532c` | `#e0804f` | `bg-color-1` |
| `--color-2` | `#9e4522` | `#ee9a6e` | `bg-color-2` |
| `--color-3` | `#2e6db4` | `#7fb0e8` | `bg-color-3` |
| `--color-4` | `#8f1c13` | `#f5a396` | `bg-color-4` |
| `--color-5` | `#1c3328` | `#3e6b55` | `bg-color-5` |
| `--neutral-1` | `#ffffff` | `#121a16` | `bg-neutral-1` |
| `--neutral-2` | `#fbf8f3` | `#1a241f` | `bg-neutral-2` |
| `--neutral-3` | `#f6f1e8` | `#24302a` | `bg-neutral-3` |
| `--neutral-4` | `#efe7da` | `#34423a` | `bg-neutral-4` |
| `--neutral-5` | `#ddd2c1` | `#4a5850` | `bg-neutral-5` |
| `--neutral-6` | `#8c7f6b` | `#6e7f74` | `bg-neutral-6` |
| `--neutral-7` | `#6b6457` | `#a69f92` | `bg-neutral-7` |
| `--neutral-8` | `#4a443a` | `#cfc8bb` | `bg-neutral-8` |
| `--neutral-9` | `#2e2a23` | `#e6e0d5` | `bg-neutral-9` |
| `--neutral-10` | `#1d1b17` | `#f2ece2` | `bg-neutral-10` |
| `--success` | `#2a7047` | `#6fcb94` | `bg-success` |
| `--warning` | `#8a5300` | `#f2b14c` | `bg-warning` |
| `--error` | `#b42318` | `#f28b7c` | `bg-error` |

Each color also has `-translucent` and `-transparent` levels, and `--on-*` names its readable foreground.

### App aliases (app/globals.css)

Use these semantic classes in UI code. Each aliases one Graphical color.

| Alias | Graphical token |
| --- | --- |
| `--background` | light `neutral-3`, dark `neutral-1` |
| `--foreground` | `neutral-10` |
| `--card` | light `neutral-1`, dark `neutral-3` |
| `--card-foreground` | `neutral-10` |
| `--popover` | light `neutral-1`, dark `neutral-3` |
| `--popover-foreground` | `neutral-10` |
| `--primary` | `color-1` |
| `--primary-foreground` | `on:color-1` |
| `--secondary` | `neutral-3` |
| `--secondary-foreground` | `neutral-10` |
| `--muted` | `neutral-4` |
| `--muted-foreground` | `neutral-8` |
| `--accent` | `color-1-transparent` |
| `--accent-foreground` | `neutral-10` |
| `--destructive` | `error` |
| `--border` | light `neutral-5`, dark `neutral-4` |
| `--input` | `neutral-6` |
| `--ring` | `color-3` |
| `--input-hover` | `neutral-8` |
| `--hover` | `neutral-3-transparent` |
| `--secondary-hover` | `neutral-4` |
| `--primary-hover` | `color-2` |
| `--destructive-hover` | `color-4` |
| `--border-strong` | `neutral-6` |
| `--border-strong-hover` | `neutral-8` |
| `--disabled-foreground` | `neutral-6` |
| `--success-subtle` | `success-transparent` |
| `--warning-subtle` | `warning-transparent` |
| `--danger-subtle` | `error-transparent` |
| `--night` | `color-5` |
| `--night-foreground` | light `neutral-3`, dark `neutral-10` |
| `--night-muted` | light `neutral-5`, dark `neutral-8` |
| `--night-rule` | light `neutral-3-transparent`, dark `neutral-10-transparent` |
| `--link` | `color-2` |
| `--sheet` | `neutral-2` |

## Type

| Step | Body size / line | Class | Display size / line | Class |
| --- | --- | --- | --- | --- |
| XXS | 10px / 14px | `text-body-xxs` | 23px / 25px | `text-display-xxs` |
| XS | 12px / 16px | `text-body-xs` | 27px / 30px | `text-display-xs` |
| S | 14px / 20px | `text-body-s` | 31px / 34px | `text-display-s` |
| M | 16px / 24px | `text-body-m` | 36px / 39px | `text-display-m` |
| L | 19px / 25px | `text-body-l` | 42px / 46px | `text-display-l` |
| XL | 22px / 25px | `text-body-xl` | 48px / 52px | `text-display-xl` |
| XXL | 26px / 28px | `text-body-xxl` | 55px / 60px | `text-display-xxl` |

A text style sets size, line height and tracking. Set the weight with `font-regular`, `font-medium` or
`font-heavy`.

## Spacing, corners and strokes

| Step | Space | Class | Corner | Class |
| --- | --- | --- | --- | --- |
| zero | 0px | `p-zero`, `gap-zero` | 0px | `corner-zero` |
| xxs | 4px | `p-xxs`, `gap-xxs` |  |  |
| xs | 8px | `p-xs`, `gap-xs` | 4px | `corner-xs` |
| s | 12px | `p-s`, `gap-s` | 10px | `corner-s` |
| m | 16px | `p-m`, `gap-m` | 14px | `corner-m` |
| l | 24px | `p-l`, `gap-l` | 20px | `corner-l` |
| xl | 32px | `p-xl`, `gap-xl` | 28px | `corner-xl` |
| xxl | 48px | `p-xxl`, `gap-xxl` |  |  |

Corner `full` is `9999px`. Strokes: `--border-s` 1px, `--border-m`
1px, `--border-l` 2px. Visible edges are box shadows (`hairline`,
`hairline-l` and the `rule-*` utilities in app/globals.css); `edge-*` sets a native border width.
Widths, heights and insets keep Tailwind's numeric scale (`w-4`, `size-11`).

## Shadows and motion

| Token | Light | Dark |
| --- | --- | --- |
| `--shadow-s` | `0px 1px 0px 0px #1d1b1700` | `0px 1px 0px 0px #f2ece200` |
| `--shadow-m` | `0px 8px 24px 0px #1d1b1700` | `0px 8px 24px 0px #121a1600` |
| `--shadow-l` | `0px 24px 60px -20px #1d1b1780` | `0px 24px 60px -20px #f2ece280` |
| `--motion-duration` | `150ms` | `150ms` |
| `--motion-easing` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--motion-large-duration` | `300ms` | `300ms` |
| `--motion-large-easing` | `cubic-bezier(0.16, 1, 0.3, 1)` | `cubic-bezier(0.16, 1, 0.3, 1)` |
