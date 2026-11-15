# Theme reference

The app runs one Graphical theme. `graphical/project.json` names it, `graphical/themes/graphical.json` holds it, and
`graphical/generated/theme.css` defines its variables. The bundled components in `components/graphical/` read the
same document (`components/graphical/theme.ts`). These references describe that installed theme; when they
disagree with the theme file, the theme file wins.

- [Cactus Peak Athletic](themes/cactus-peak-athletic.md) · [component assignments](themes/cactus-peak-athletic-components.md)
