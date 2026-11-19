# Member web app: repo map

The app answers one question first: what am I doing, can I get in, how busy is it, where is my pass. Four places
(Home, Book, Bookings, Clubs) and one Account page serve that. Pages are sections of ruled lists on the marketing
site's type, spacing and rule classes. This map covers the interface layer. The data layer did not change in the
redesign.

## Capabilities

| Capability | Folder | Files | Public symbols |
|---|---|---|---|
| Design vocabulary | `app/`, `graphical/` | `globals.css`, `tailwind-reset.css`, `graphical/generated/theme.css`, `graphical/generated/tailwind-theme.css` | classes `text-body-*`, `text-display-*`, `display-lead`, `display-quiet`, `lede`, `font-display-wide`, `tabular`, `corner-*`, `hairline`, `rule-*`, named spacing (`p-m`, `gap-xl`, `py-section`) |
| App parts | `components/kit/` | `app.tsx` | `AppPage`, `TabLinks`, `TabButtons`, `Toolbar`, `Card`, `CardLink`, `Stats`, `Stat`, `Rows`, `Row`, `Facts`, `Split`, `Panel`, `PanelEmpty`, `Task`, `Group` |
| Screen parts | `components/*/parts.tsx`, `components/app/screen-parts.tsx` | `flows/parts.tsx`, `reserve/parts.tsx`, `booking/parts.tsx`, `clubs/parts.tsx`, `family/parts.tsx`, `account/parts.tsx`, `settings/parts.tsx` | `ChoiceList`, `PlanColumn`, `SlotCell`, `DateTile`, `ListRow`, `FactGrid`, `BarList`, `SettingRow`, ... |
| Command menu | `components/kit/` | `command.tsx` | `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator` (the shadcn `command` composition, cmdk behaviour, no cmdk dependency) |
| Older shared parts | `components/kit/` | `ui.tsx`, `overlays.tsx`, `ribs.tsx`, `progress.tsx`, `calendar.tsx` | `EmptyState`, `Banner`, `SelectBox`, `Modal`, `SideSheet`, ... |
| Navigation | `components/app/` | `nav.ts` | `PRIMARY_NAV`, `ACCOUNT_PATHS`, `isCurrent`, `NAV`, `canSee`, `canOpen` |
| Shell | `components/app/` | `shell.tsx`, `household-gate.tsx`, `banners.tsx`, `global-dialogs.tsx` | `StoreGate`, `FRAME`, `ShellSkeleton`, `PaymentBanners`, `GlobalDialogs` |
| Home | `components/today/` | `today-page.tsx` | default `TodayPage` (`/today`) |
| Book | `components/book/`, `components/schedule/`, `components/booking/`, `components/reserve/`, `components/training/` | `book-tabs.tsx`, `schedule-page.tsx`, `class-row.tsx`, `session-action.tsx`, `session-detail.tsx`, `courts-page.tsx`, `lanes-page.tsx`, `kids-page.tsx`, `training-page.tsx` | `BookTabs`, `BookHeader`, `ScheduleRow`, `SessionAction` |
| Bookings | `components/bookings/` | `bookings-page.tsx`, `upcoming.tsx`, `past.tsx`, `booking-panel.tsx` | default `BookingsPage` (`/bookings`, `?tab=past`, `?who=`) |
| Clubs | `components/clubs/` | `clubs-page.tsx`, `club-detail.tsx`, `club-map.tsx` | default `ClubsPage` |
| Account | `components/account/`, `components/membership/`, `components/billing/`, `components/family/`, `components/guest/`, `components/settings/` | `account-page.tsx` and the detail pages | default `AccountPage` (`/account`), `SettingsShell` |
| Inbox, Help, Pass, Progress | `components/inbox/`, `components/app/`, `components/progress/` | `inbox.tsx`, `help.tsx`, `pass-page.tsx`, `progress-page.tsx` | |
| Rules and data | `lib/` | `engine.ts`, `actions.ts`, `store.ts`, `advance.ts`, `data/*`, `time.ts` | see file headers |

## Data flow

`app/layout.tsx` (catalog from Supabase, server) → `CatalogBoundary` → `lib/data/catalog.ts` globals.
`app/(app)/layout.tsx` (session check) → `StoreGate` → `lib/store.ts` (household rows) → `useApp()` → page components.
Page components read with `lib/engine.ts` selectors and write with `lib/actions.ts`. No page talks to Supabase directly.
`PRIMARY_NAV` and `HELP_NAV` → the `shell.tsx` sidebar and phone tab bar (Household and Account are in the user menu). `ACCOUNT_NAV` and `ACCOUNT_PATHS` → the Account side menu.

## Tests

| Test file | Covers |
|---|---|
| `lib/__tests__/rows.test.ts` | `lib/data/rows.ts`, `lib/data/state.ts` |
| `lib/__tests__/rules.test.ts` | `lib/time.ts`, `lib/engine.ts` |

The interface layer has no tests. Check it with `pnpm typecheck`, `pnpm lint` and the browser.
