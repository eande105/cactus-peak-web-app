import type { ThemeDocument } from './lib/theme-model';
import project from '../../graphical/themes/graphical.json';

// App change (Cactus Peak): the runtime reads the active Graphical project theme, graphical/themes/graphical.json,
// instead of a captured snapshot. That file is the single source of the theme: graphical/generated/theme.css is
// generated from it, and the Graphical editor's Copy for agent batches update it (graphical-adopt).
export const theme = project as unknown as ThemeDocument;
