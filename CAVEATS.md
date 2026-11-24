# Caveats

- **The account theme is the source; each app installs a copy.** The theme saved on graphicalui.com is the source
  of truth. Each app keeps its installed copy in `graphical/themes/graphical.json`, because the editor and the
  installer read the theme from the app's own `graphical/` folder. Nothing checks that a copy still matches the
  account: after a change on the website, install it in both apps (GUI.md, "This project").
- **Dark mode is this app's own.** The marketing site is light only, so the shared theme's dark values were tuned
  here. The surface and Saguaro Night text roles change step with the mode (`app/globals.css`). In dark mode
  `--night` is the theme's color-5 (#3e6b55), not the fixed #1c3328 the app used before.
- **Converted with the check-mode conversion.** `npx graphical-install` refits the theme's units to the app, so this
  app was converted with `graphical/install/convert.mjs` instead (see GUI.md). Off-scale spacing snapped to the
  nearest step (for example `p-0.5` to `p-xxs`, `mt-5` to `mt-l`).
- **App layouts, not website layouts.** The shell is a Sand sidebar beside one white content sheet. A screen sits on
  the sheet and uses the parts in `components/kit/app.tsx`. Lists and tables sit on the sheet with rules between
  rows. A bordered `Card` is only for a block that stands alone. Numbers that belong together are one `Stats`
  block. The pages outside the shell (sign-in, error, offline, not-found) keep their larger titles.
- **Button sizes differ from the Graphical spec.** `components/ui/button.tsx` uses 36 px (`md`) and 28 px (`sm`)
  in the app, and 44 px on a phone. The Graphical Button is 44 px. `lg` is for pages outside the shell.
- **Fragile selectors.** The clubs map and the inbox block compute their height from a one-line page title.
- **Step flows are routes.** Freeze, cancel, change plan, add a member and book a coach are `Task` cards on their
  own routes, not dialogs over the parent screen.
- **Known gaps.** Lap lanes have no hold (the data layer has none). A court move still asks for player names that
  `moveReservation` does not use. `EmptyState` has no small size. `NoticeRow` and the dialogs in `global-dialogs.tsx` keep their older markup.

- **Stubs.** Card payments, push, Wallet, photo upload, the calendar feed, passkeys, "Download my data" and PDF
  invoices are simulated (see BUILD-NOTES.md).
- **BUILD-NOTES.md is out of date** for navigation: it describes the sidebar and 14 destinations.
- **The password check is a browser-side gate.** `StepUpGate` (`components/app/step-up.tsx`) draws the password
  form in place of Billing and the plan flows when the last check is older than 30 minutes. The shell applies it
  by path (`needsStepUp`). The time of the last check is in `localStorage`, so the gate does not stop a member who
  edits browser storage. Row level security in Supabase is the server-side limit.
  Proposal: record the time of the last check on the server and have the plan and billing writes require it.
- **Crowd levels are typical.** `clubs` and `club_areas` hold typical hourly levels (4 am to 9 pm), not live counts. The
  club level and its words (`liveBusyness`) keep their old name but read the same typical arrays. Only area levels are
  worded "Usually …"; the club switcher and club rows show the level word alone.
- **Classes still compare clubs.** The class filter drawer can show several clubs (`?club=a,b`). A single `?club=` slug
  sets the current club and leaves the URL. Courts, lap lanes and kids club follow the current club only.
- **A club without the facility.** The Courts, Lap lanes and Kids club tabs show `NoFacility` with the clubs that have
  it, instead of jumping to another club.
- **You and Help in the sidebar.** `/help` is in the You match list and also has its own sidebar link, so both show as
  current there. The unread count is on You, because Inbox is not a place any more.
- **Training is untouched.** Training still ends in its own success panel and is not tied to the current club.
  `SuccessPanel` is still used by Training, Household, Membership flows.
- **Not checked in a browser.** The change passed `pnpm typecheck`, `pnpm lint` and `pnpm test` only. The phone header
  width (Pass, Search, bell, avatar), the switcher in the Book header and the two-button toast need a look.
- **Fixture has no areas.** `lib/__tests__/fixture.ts` reads `areas` from the seed JSON, which has none, so tests use
  inline `ClubArea` values.
- **Past-hour counts.** The slot grid "Open" row shows no count for a start time that has gone by.

## iOS parity redesign (Nov 22, 2026)

- `components/bookings/booking-detail.tsx` copies the check-in token format from `components/app/check-in-pass.tsx`, which does not export it. Change both together, or export the token builder from one place.
- `HeroHeader` cancels the shell gutter with `-mx-m -mt-m` below `lg`. If the shell's phone padding changes, change the hero too.
- Class detail no longer shows the club map, "Open in Maps" or "Call the club"; the Club row links to the club page.
- Club detail on phones has no tabs; desktop keeps Overview, Classes and Amenities. The Amenities tab no longer lists kids club blocks (Reserve covers them).
- Checked in a browser at 375 px and 1440 px, light and dark: every redesigned page, and training and past bookings. Not checked: held and waitlisted bookings (the demo data has none), and iPad widths between 768 and 1023 px.
