# Member web app: repo map

The app exists for three jobs: book classes, reserve courts, lap lanes and kids club, and check how busy a club is
and how many spots are open. Four places (Today, Book, Clubs, You) serve that. Bookings sit under Today ("Coming up",
"See all") and Progress, Inbox, Household and Help sit under You. Pages are sections of ruled lists on the marketing
site's type, spacing and rule classes. Pool, therapy pool, sauna and recovery are areas: a crowd level only, never
reserved, always worded "Usually …" because the values are typical, not live.

## Capabilities

| Capability | Folder | Files | Public symbols |
|---|---|---|---|
| Design vocabulary | `app/`, `graphical/` | `globals.css`, `tailwind-reset.css`, `graphical/generated/theme.css`, `graphical/generated/tailwind-theme.css` | classes `text-body-*`, `text-display-*`, `display-lead`, `display-quiet`, `lede`, `font-display-wide`, `tabular`, `corner-*`, `hairline`, `rule-*`, named spacing (`p-m`, `gap-xl`, `py-section`) |
| App parts | `components/kit/` | `app.tsx` | `AppPage`, `TabLinks`, `TabButtons`, `Toolbar`, `Card`, `CardLink`, `Stats`, `Stat`, `Rows`, `Row`, `Facts`, `Split`, `Panel`, `PanelEmpty`, `Task`, `Group` |
| Screen parts | `components/*/parts.tsx`, `components/app/screen-parts.tsx` | `flows/parts.tsx`, `reserve/parts.tsx`, `booking/parts.tsx`, `clubs/parts.tsx`, `family/parts.tsx`, `account/parts.tsx`, `settings/parts.tsx` | `ChoiceList`, `PlanColumn`, `SlotCell`, `DateTile`, `ListRow`, `FactGrid`, `BarList`, `SettingRow`, ... |
| Command menu | `components/kit/` | `command.tsx` | `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator` (the shadcn `command` composition, cmdk behaviour, no cmdk dependency) |
| Older shared parts | `components/kit/` | `ui.tsx`, `overlays.tsx`, `ribs.tsx`, `progress.tsx`, `calendar.tsx` | `EmptyState`, `Banner`, `SelectBox`, `Modal`, `SideSheet`, ... |
| Navigation | `components/app/` | `nav.ts` | `PRIMARY_NAV` (Today, Book, Clubs, You), `HELP_NAV`, `ACCOUNT_PATHS`, `isCurrent`, `NAV`, `canSee`, `canOpen` |
| Current club | `components/clubs/` | `club-switcher.tsx` | `ClubSwitcher`, `useClubParam` (`prefs.viewingClub` is the one current club; a single-slug `?club=` on a Book page sets it once) |
| Booking toast | `lib/` | `booked-toast.ts`, `toast.tsx` | `bookedToast` ("Booked · what · time", Undo, View → `/bookings?open=<id>`) |
| Shell | `components/app/` | `shell.tsx`, `household-gate.tsx`, `banners.tsx`, `global-dialogs.tsx` | `StoreGate`, `FRAME`, `ShellSkeleton`, `PaymentBanners`, `GlobalDialogs` |
| Today | `components/today/` | `today-page.tsx` | default `TodayPage` (`/today`; "Coming up" lists every upcoming kind, "See all" opens Bookings) |
| Book | `components/book/`, `components/schedule/`, `components/booking/`, `components/reserve/`, `components/training/` | `book-tabs.tsx`, `schedule-page.tsx`, `class-row.tsx`, `session-action.tsx`, `session-detail.tsx`, `courts-page.tsx`, `lanes-page.tsx`, `kids-page.tsx`, `no-facility.tsx`, `training-page.tsx` | `BookPage` (holds the club switcher), `ScheduleRow`, `SessionAction`, `NoFacility` |
| Bookings | `components/bookings/` | `bookings-page.tsx`, `upcoming.tsx`, `past.tsx`, `booking-panel.tsx` | default `BookingsPage` (`/bookings`, `?tab=past`, `?who=`) |
| Clubs | `components/clubs/` | `clubs-page.tsx`, `club-row.tsx`, `club-detail.tsx`, `club-map.tsx` | default `ClubsPage` (list left, sticky map right from 768 px; map card above the list on phones), `ClubRow` (name and pills, crowd word and meter, three fixed book-next facts, areas on a list 28rem or wider), `ClubDetail` ("Crowd level" section) |
| Account | `components/account/`, `components/membership/`, `components/billing/`, `components/family/`, `components/guest/`, `components/settings/` | `account-page.tsx`, `screen.tsx` and the detail pages | default `AccountPage` (`/account`), `SettingsShell`; `screen.tsx`: `AccountScreen` (frame of every Account page, title from `ACCOUNT_NAV`), `AccountMenuList` (phone menu on Overview), `AccountBack` (phone back link, drawn by the shell), `SummaryCard` (also the cost cards on Household), `IconTile`; `settings/parts.tsx`: `SettingsSection` (heading + raised card, `tone="danger"`), `SettingRow`/`SettingSwitch` (`icon`) |
| Inbox, Help, Pass, Progress | `components/inbox/`, `components/app/`, `components/progress/` | `inbox.tsx`, `help.tsx`, `pass-page.tsx`, `progress-page.tsx` | |
| Rules and data | `lib/` | `engine.ts`, `actions.ts`, `store.ts`, `advance.ts`, `data/*`, `time.ts` | see file headers |

## Data flow

`app/layout.tsx` (catalog from Supabase, server: clubs and `club_areas`, mapped by `clubAreaFromRow` in `lib/data/rows.ts`) → `CatalogBoundary` → `lib/data/catalog.ts` globals (`CLUB_AREAS`, `areasOf`).
`app/(app)/layout.tsx` (session check) → `StoreGate` → `lib/store.ts` (household rows) → `useApp()` → page components.
Page components read with `lib/engine.ts` selectors and write with `lib/actions.ts`. No page talks to Supabase directly.
`PRIMARY_NAV` → the `shell.tsx` sidebar and the phone tab bar (the same four places). `HELP_NAV` and Search sit at the bottom of the sidebar; on a phone the header has Pass, Search and the Inbox bell. `/account` lists Bookings, Progress, Inbox, Household and Help. `ACCOUNT_NAV` (with `group`, `icon`, `line`) and `ACCOUNT_GROUPS` → the grouped Account side menu from lg, `AccountMenuList` below lg, and every Account page title; `ACCOUNT_PATHS` → which paths get the Account menu.
`prefs.viewingClub` → `ClubSwitcher` (Today, Book header) → Book pages and Today. Crowd copy: `areaCrowd`, `clubCrowdAt` and `usually` in `lib/engine.ts`. Every booking kind ends in `bookedToast`; `/reserve/confirmed/[id]` redirects to `/bookings`.

## Tests

| Test file | Covers |
|---|---|
| `lib/__tests__/rows.test.ts` | `lib/data/rows.ts` (household rows, `clubAreaFromRow`), `lib/data/state.ts` |
| `lib/__tests__/rules.test.ts` | `lib/time.ts`, `lib/engine.ts` (`areaCrowd`, `usually`, `nextCourtOpen`, `nextLaneOpen`, `nextKidsOpen`, `hourStart`) |

The interface layer has no tests. Check it with `pnpm typecheck`, `pnpm lint` and the browser.

## iOS parity parts and routes (Nov 22, 2026)

- `components/kit/detail.tsx`: shared detail parts ported from the iOS app (`SectionHeader`, `FactRow`, `StatStrip`/`StatItem`, `DateBadge`, `RowPill`, `BookingTile`, `HeroHeader`, `PassCard`, `CancelPolicy`, `BookingListRow`, `OutcomeMark`). Presentational: plain props, never `useApp()`.
- `app/(app)/bookings/[bookingId]/page.tsx` → `components/bookings/booking-page.tsx` → `booking-detail.tsx`: the booking as a pass. On `lg+` the Bookings page shows the same `BookingDetail` in a `Split` panel (`?open=<id>`); on phones `?open=` redirects to the route.
- `app/(app)/bookings/strikes/page.tsx` → `components/bookings/strikes-page.tsx`: late cancels and the rules.
- `components/reserve/slot-rows.tsx`: phone slot rows (time column, court tiles, lane strips, kids meter); `lg+` keeps `SlotGrid`.
- `components/clubs/club-detail-parts.tsx`, `components/booking/session-parts.tsx`, `components/account/ios-pass-card.tsx`, `components/family/ios-member-intro.tsx`: page parts for the club, class, You and family member pages.
- Today: `components/today/today-layout.tsx` (`TodayGrid`: three layouts by the page's container width — narrow one column, `@3xl` tiles on top with Coming up beside Needs you and Streak, `@6xl` main column plus sticky right rail; cards that move between layouts have one copy hidden per layout so reading order matches the screen), `today-coming.tsx` (Coming up rows with `BookingTile`), `today-drawer.tsx` (`?booking=<id>` opens `BookingDetail` in `SideSheet` from 768 px; phones link to `/bookings/<id>` or the class page).

## Status pages and slot marks (Nov 23, 2026)

- `components/app/status-page.tsx`: `StatusPage` (object, title, one line, actions; `standalone` fills the window and adds the brand mark). Used by `/403`, `/maintenance`, `not-found.tsx`, `/offline` and the shell's no-access state. Reference: incident.io and Snowflake empty pages on Mobbin.
- Slot marks: open time is a light outlined cell, taken is hatched, partly free is a light tint, and only the pick is solid. `TONE` in `components/reserve/parts.tsx` (desktop `SlotGrid`, `SlotLegend`) and `OPEN_EDGE`/`HATCH` in `components/reserve/slot-rows.tsx` (phone `CourtTiles`, `LaneStrips`) must stay the same marks. Reference: Deputy and Calendly timelines.
- `components/app/pass-dialog.tsx`: `openPass(memberId?)` and `PassDialog`, the one way to open the pass. Content follows the pointer: a touch screen gets `CheckInPass variant="sheet"` (name, QR code, member number); a computer gets a prompt to text the pass to the member's phone. The frame follows the width: a dialog from 768 px (shadcn "With Form" dialog: header, body, Cancel and action in the footer), a bottom drawer with a swipe handle and no close button below it. Callers: the sidebar and phone header Pass buttons, Today's Next up, the pass card on You, the family list menu, a family member's page, the compact pass and the command menu. `/pass` stays as a page for deep links and the offline page.
- `hooks/use-pass-in-view.ts`: `PASS_ANCHOR` marks a page's own pass control (Today's Next up Pass, the pass card on You, a family member's intro Pass). `usePassInView` in `shell.tsx` hides the phone header Pass button while one is on screen and shows it again after the member scrolls past. A page with no marked control always shows the header button.
