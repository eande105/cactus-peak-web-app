# Invariants

1. A page reads state with `useApp()` and `lib/engine.ts`, and writes with `lib/actions.ts`. It never calls Supabase.
   Enforced by: prose only.
2. Times print as "8 am" and "4:30 pm": no ":00" on the hour.
   Enforced by: `lib/time.ts` `fmtTime`, test `lib/__tests__/rules.test.ts` ("formats times with am and pm").
3. The top bar and the phone tab bar take their places from `PRIMARY_NAV` only. A new place is a new entry there.
   Enforced by: types (`PrimaryNavItem`) and one consumer, `components/app/shell.tsx`.
4. A route a member may not open shows the no-access state, not the page.
   Enforced by: `canOpen` in `components/app/nav.ts`, called by the shell for every path.
5. An edge is a box shadow (`hairline`, `rule-*`, `raised`), never a native border, except a dashed edge. A card on the sheet is `raised`; the sheet itself is `bg-sheet`.
   Enforced by: prose only.
6. A heading has no eyebrow above it. `eyebrow` is a quiet label for data only.
   Enforced by: `AppPage` and `Card` have no eyebrow prop. Other uses: prose only.
