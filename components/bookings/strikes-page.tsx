"use client"
import { useApp } from "@/components/app/use-app"
import {
  CheckCircle2,
  Clock,
  Pause,
  Smile,
  TriangleAlert,
} from "@/components/icons"
import { AppPage, Card } from "@/components/kit/app"
import { FactRow } from "@/components/kit/detail"
import { Banner } from "@/components/kit/ui"
import { activeStrikes, pausedUntil } from "@/lib/engine"
import { DAY, fmtDay, fmtDayLong, fmtDayShort } from "@/lib/time"
import { cn } from "@/lib/utils"

const MAX = 3

/**
 * Late cancels: three slots that fill, the day the oldest clears, each late cancel, and the rules. The count is the
 * signed-in member's own, as on the Bookings stat card.
 */
export default function StrikesPage() {
  const { s, me, now } = useApp()
  const list = activeStrikes(s, me.id, now)
  const paused = pausedUntil(s, me.id, now)
  const full = list.length >= MAX
  return (
    <AppPage
      title="Strikes"
      width="narrow"
      back={{ href: "/bookings", label: "Bookings" }}
    >
      {/* After the Unify and Searchable usage pages: the count against its limit, one bar and the date it eases, then
          the entries as one table card, then the rules as one card. */}
      <Card compact>
        <div className="gap-m flex flex-col">
          <div className="gap-s flex flex-wrap items-end justify-between">
            <div className="gap-xxs flex flex-col">
              <h2 className="text-body-s font-medium text-muted-foreground">
                Late cancels in the last 30 days
              </h2>
              <p className="tabular font-display-wide text-display-s font-heavy">
                {list.length}
                <span className="text-muted-foreground"> / {MAX}</span>
              </p>
            </div>
            <p
              className={cn(
                "text-body-s font-medium",
                full ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {full
                ? "New bookings are paused"
                : MAX - list.length === 1
                  ? "1 more strike pauses booking for 3 days"
                  : `${MAX - list.length} more strikes pause booking for 3 days`}
            </p>
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: a native meter draws its own bar and would change the look */}
          <div
            role="meter"
            aria-label="Late cancels in the last 30 days"
            aria-valuemin={0}
            aria-valuemax={MAX}
            aria-valuenow={Math.min(list.length, MAX)}
            aria-valuetext={`${list.length} of ${MAX}`}
            className="gap-xxs flex"
          >
            {Array.from({ length: MAX }, (_, i) => i).map((i) => (
              <span
                key={i}
                className={cn(
                  "h-2 flex-1 first:corner-l-xs last:corner-r-xs",
                  i < list.length
                    ? full
                      ? "bg-destructive"
                      : "bg-warning"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-body-s text-pretty text-muted-foreground">
            {list.length
              ? `The oldest clears on ${fmtDayLong(list[0].at + 30 * DAY)}.`
              : "You have no late cancels. Cancel at least 2 hours before to keep it that way."}
          </p>
        </div>
      </Card>

      {paused ? (
        <Banner
          tone="warning"
          title={`Booking is paused until ${fmtDay(paused)}`}
        >
          You can still cancel and check in.
        </Banner>
      ) : null}

      <Card
        title="Your late cancels"
        description={
          list.length ? `${list.length} in the last 30 days` : undefined
        }
        flush
      >
        {list.length ? (
          <table className="w-full text-body-s">
            <thead>
              <tr className="text-left text-body-xs text-muted-foreground rule-b">
                <th className="px-m py-xs font-medium">Booking</th>
                <th className="px-m py-xs text-right font-medium">Clears</th>
              </tr>
            </thead>
            <tbody>
              {list.map((k) => (
                <tr key={k.id} className="rule-b last:shadow-none">
                  <td className="px-m py-s">
                    <span className="gap-xs flex items-center">
                      <TriangleAlert
                        className="size-4 shrink-0 text-warning"
                        aria-hidden="true"
                      />
                      {k.title}
                    </span>
                  </td>
                  <td className="tabular px-m py-s text-right text-muted-foreground">
                    {fmtDayShort(k.at + 30 * DAY)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-m pb-m">
            <FactRow
              icon={<CheckCircle2 />}
              text="No late cancels"
              secondary="In the last 30 days"
            />
          </div>
        )}
      </Card>

      <Card title="How strikes work">
        <div className="gap-xs flex flex-col">
          <FactRow
            icon={<Clock />}
            text="Cancel free up to 2 hours before"
            secondary="Personal training needs 24 hours"
          />
          <FactRow
            icon={<TriangleAlert />}
            tone="warning"
            text="A later cancel or a no-show is a strike"
          />
          <FactRow
            icon={<Pause />}
            tone="warning"
            text="3 strikes in 30 days pause new bookings for 3 days"
          />
          <FactRow icon={<Smile />} text="Kids club has no strikes" />
        </div>
      </Card>
    </AppPage>
  )
}
