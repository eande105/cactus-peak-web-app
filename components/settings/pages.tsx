"use client"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useState } from "react"
import { IconTile } from "@/components/account/screen"
import { useApp } from "@/components/app/use-app"
import { Switch, Toggle } from "@/components/graphical"
import {
  Accessibility,
  Activity,
  CalendarDays,
  CalendarPlus,
  ChildHead,
  Clock,
  Copy,
  Download,
  Eye,
  Inbox,
  KeyRound,
  Laptop,
  ListFilter,
  Lock,
  MapPin,
  MessageSquare,
  MonitorSmartphone,
  Moon,
  Smartphone,
  Sparkles,
  SunMedium,
  TrendingUp,
} from "@/components/icons"
import { CategoryIcon } from "@/components/kit/icons"
import { Confirm } from "@/components/kit/overlays"
import {
  Banner,
  PersonAvatar,
  Segmented,
  SelectBox,
  StatusPill,
} from "@/components/kit/ui"
import {
  SettingBlock,
  SettingRow,
  SettingSwitch,
  SettingsSection,
} from "@/components/settings/parts"
import { Saved } from "@/components/settings/settings-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  addPasskey,
  changeHomeClub,
  removePasskey,
  resetCalendarToken,
  setNotifCell,
  setPrefs,
  signOut,
  updateMember,
} from "@/lib/actions"
import { CATEGORIES, CLUBS } from "@/lib/data/catalog"
import { toast } from "@/lib/toast"
import type { CategoryId } from "@/lib/types"

function useSaved() {
  const [k, setK] = useState("")
  return {
    k,
    mark: (x: string) => {
      setK(x)
      setTimeout(() => setK(""), 3000)
    },
  }
}

export function ProfileSettings() {
  const { me, prefs } = useApp()
  const { k, mark } = useSaved()
  const [first, setFirst] = useState(me.firstName)
  const [last, setLast] = useState(me.lastName)
  const [pref, setPref] = useState(prefs.preferredName)
  const [phone, setPhone] = useState(prefs.phone)
  const [email, setEmail] = useState(me.email)
  const [em, setEm] = useState(prefs.emergency)
  const [err, setErr] = useState("")
  return (
    <>
      <SettingsSection id="set-photo" title="Photo">
        <SettingRow
          lead={
            <PersonAvatar
              name={`${me.firstName} ${me.lastName}`}
              hue={me.hue}
              size={48}
              className="shrink-0"
            />
          }
          label="Pass photo"
          line="Needed for your pass. A clear face photo, at least 400 px wide."
        >
          <Button variant="outline" size="sm" disabled>
            Upload a photo · Coming soon
          </Button>
        </SettingRow>
      </SettingsSection>
      <SettingsSection
        id="set-name"
        title="Name"
        action={<Saved show={["fn", "ln", "pn"].includes(k)} />}
      >
        <SettingRow label="First name" wide>
          {(p) => (
            <Input
              {...p}
              autoComplete="given-name"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              onBlur={() => {
                updateMember(me.id, { firstName: first })
                mark("fn")
              }}
            />
          )}
        </SettingRow>
        <SettingRow label="Last name" wide>
          {(p) => (
            <Input
              {...p}
              autoComplete="family-name"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              onBlur={() => {
                updateMember(me.id, { lastName: last })
                mark("ln")
              }}
            />
          )}
        </SettingRow>
        <SettingRow label="Preferred name" wide>
          {(p) => (
            <Input
              {...p}
              value={pref}
              onChange={(e) => setPref(e.target.value)}
              onBlur={() => {
                setPrefs(me.id, { preferredName: pref })
                mark("pn")
              }}
            />
          )}
        </SettingRow>
        <SettingRow
          label="Date of birth"
          line="Read-only after it is set."
          wide
        >
          {(p) => <Input {...p} readOnly value={me.dob} />}
        </SettingRow>
      </SettingsSection>
      <SettingsSection
        id="set-contact"
        title="Contact"
        action={<Saved show={["ph", "em", "ec"].includes(k)} />}
      >
        <SettingRow label="Mobile number" error={err} wide>
          {(p) => (
            <Input
              {...p}
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => {
                if (phone.replace(/\D/g, "").length < 10)
                  return setErr("Check the mobile number. Use 10 digits.")
                setErr("")
                setPrefs(me.id, { phone })
                mark("ph")
              }}
            />
          )}
        </SettingRow>
        <SettingRow
          label="Email"
          line="We email a link to verify a change."
          wide
        >
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                updateMember(me.id, { email })
                mark("em")
              }}
            />
          )}
        </SettingRow>
        <SettingRow label="Emergency contact" wide>
          {(p) => (
            <Input
              {...p}
              value={em}
              onChange={(e) => setEm(e.target.value)}
              placeholder="Name, phone"
              onBlur={() => {
                setPrefs(me.id, { emergency: em })
                mark("ec")
              }}
            />
          )}
        </SettingRow>
      </SettingsSection>
    </>
  )
}

const GOALS = [
  { value: "build-strength", label: "Build strength" },
  { value: "move-more", label: "Move more" },
  { value: "event", label: "Train for an event" },
  { value: "stay-consistent", label: "Stay consistent" },
  { value: "recover", label: "Recover well" },
] as const

export function PreferencesSettings() {
  const { me, hh, prefs } = useApp()
  const { k, mark } = useSaved()
  const [err, setErr] = useState("")
  const toggle = (id: CategoryId) => {
    setPrefs(me.id, {
      interests: prefs.interests.includes(id)
        ? prefs.interests.filter((x) => x !== id)
        : [...prefs.interests, id],
    })
    mark("i")
  }
  return (
    <>
      <SettingsSection
        id="set-club"
        title="Home club"
        action={<Saved show={k === "hc"} />}
      >
        <SettingRow
          label="Home club"
          icon={MapPin}
          line={
            hh.plan === "trailhead"
              ? "Trailhead members change it once per billing cycle."
              : "Ridge and Summit members change it any time."
          }
          error={err}
          wide
        >
          <SelectBox
            label="Home club"
            hideLabel
            value={me.homeClub}
            onChange={(v) => {
              const r = changeHomeClub(me.id, v)
              if (!r.ok) setErr(r.message)
              else {
                setErr("")
                mark("hc")
                toast({ title: "Home club updated" })
              }
            }}
            options={CLUBS.map((c) => ({ value: c.slug, label: c.name }))}
          />
        </SettingRow>
      </SettingsSection>
      <SettingsSection
        id="set-interests"
        title="Interests"
        action={<Saved show={k === "i"} />}
      >
        <SettingBlock>
          <ul className="gap-xs flex flex-wrap" aria-label="Interests">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Toggle
                  pressed={prefs.interests.includes(c.id as CategoryId)}
                  onPressedChange={() => toggle(c.id as CategoryId)}
                  className="max-md:min-h-11"
                >
                  {/* Plain icon and name: a tinted badge has no contrast on the pressed (Night) fill. */}
                  <CategoryIcon
                    id={c.id as CategoryId}
                    className="size-4 shrink-0"
                  />
                  {c.name}
                </Toggle>
              </li>
            ))}
          </ul>
        </SettingBlock>
      </SettingsSection>
      <SettingsSection
        id="set-goal"
        title="Goal"
        action={<Saved show={k === "g" || k === "w"} />}
      >
        <SettingRow label="Goal" icon={TrendingUp} wide>
          <SelectBox
            label="Goal"
            hideLabel
            value={prefs.goal}
            onChange={(v) => {
              setPrefs(me.id, { goal: v })
              mark("g")
            }}
            options={[...GOALS]}
          />
        </SettingRow>
        <SettingRow label="Visits per week" icon={CalendarDays}>
          <Segmented
            label="Visits per week"
            value={prefs.weeklyTarget}
            onChange={(v) => {
              setPrefs(me.id, { weeklyTarget: v })
              mark("w")
            }}
            options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
              value: n,
              label: String(n),
            }))}
          />
        </SettingRow>
      </SettingsSection>
      <SettingsSection
        id="set-filters"
        title="Schedule"
        action={<Saved show={k === "ft"} />}
      >
        <SettingSwitch
          label="Show first-timer classes first"
          icon={Sparkles}
          checked={prefs.firstTimersFirst}
          onChange={(c) => {
            setPrefs(me.id, { firstTimersFirst: c })
            mark("ft")
          }}
        />
        <SettingRow label="Saved schedule filters" icon={ListFilter}>
          {prefs.savedFilters ? null : <StatusPill>None</StatusPill>}
          <Button
            variant="outline"
            size="sm"
            disabled={!prefs.savedFilters}
            onClick={() => {
              setPrefs(me.id, { savedFilters: undefined })
              toast({ title: "Saved filters cleared" })
            }}
          >
            Clear
          </Button>
        </SettingRow>
      </SettingsSection>
    </>
  )
}

const TOPICS = [
  ["reminders", "Class reminders"],
  ["waitlist", "Waitlist and held spots"],
  ["changes", "Booking changes"],
  ["coach", "Coach messages"],
  ["news", "Club news"],
  ["billing", "Billing"],
  ["marketing", "Marketing"],
] as const
const TH =
  "h-9 text-body-xs font-medium whitespace-nowrap text-muted-foreground"

export function NotificationSettings() {
  const { me, prefs } = useApp()
  const { k, mark } = useSaved()
  const [push, setPush] = useState<"default" | "granted" | "denied">(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  )
  const ask = async (topic: string, on: boolean) => {
    if (
      on &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      const r = await Notification.requestPermission()
      setPush(r)
    }
    setNotifCell(me.id, topic, "push", on)
    mark("n")
  }
  return (
    <>
      <SettingsSection
        id="set-quiet"
        title="Delivery"
        action={<Saved show={k === "q"} />}
      >
        <SettingSwitch
          label="Quiet hours 9 pm – 5 am"
          icon={Moon}
          line="Held-spot alerts still come through."
          checked={prefs.quietHours}
          onChange={(c) => {
            setPrefs(me.id, { quietHours: c })
            mark("q")
          }}
        />
        <SettingRow
          label="Push in this browser"
          icon={MonitorSmartphone}
          line={
            push === "denied"
              ? "Use email or text."
              : push === "default"
                ? "Turn on a Push switch and the browser asks."
                : undefined
          }
        >
          <StatusPill
            tone={
              push === "granted"
                ? "success"
                : push === "denied"
                  ? "warning"
                  : "neutral"
            }
          >
            {push === "granted"
              ? "On"
              : push === "denied"
                ? "Blocked"
                : "Not asked"}
          </StatusPill>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast({
                title: "Test notification",
                description: "This is what an alert looks like.",
                type: "info",
              })
            }
          >
            Send test
          </Button>
        </SettingRow>
      </SettingsSection>
      <SettingsSection
        id="set-topics"
        title="Topics"
        action={<Saved show={k === "n" || k === "r"} />}
      >
        <div className="-mx-m overflow-hidden corner-m">
          <table className="w-full text-left text-body-m sm:text-body-s">
            <caption className="sr-only">
              Notification topics and channels
            </caption>
            <thead>
              <tr className="bg-muted/50 rule-b">
                <th scope="col" className={`${TH} pl-m`}>
                  Topic
                </th>
                {["Push", "Email", "Text"].map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className={`${TH} w-14 text-center sm:w-20 ${c === "Text" ? "pr-s" : ""}`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr+tr]:rule-t">
              {TOPICS.map(([t, label]) => (
                <tr key={t}>
                  <th scope="row" className="py-s pr-s pl-m font-medium">
                    {label}
                    {t === "reminders" ? (
                      <SelectBox
                        label="Time before"
                        hideLabel
                        value={String(prefs.reminderMin)}
                        onChange={(v) => {
                          setPrefs(me.id, { reminderMin: Number(v) as 60 })
                          mark("r")
                        }}
                        options={[
                          { value: "30", label: "30 min before" },
                          { value: "60", label: "60 min before" },
                          { value: "120", label: "120 min before" },
                        ]}
                        className="mt-xs w-36 font-regular"
                      />
                    ) : null}
                    {t === "billing" ? (
                      <span className="block font-regular text-muted-foreground">
                        Email is always on.
                      </span>
                    ) : null}
                  </th>
                  {(["push", "email", "text"] as const).map((c) => (
                    <td
                      key={c}
                      className={
                        c === "text" ? "pr-s text-center" : "text-center"
                      }
                    >
                      <Switch.Root
                        aria-label={`${label}, ${c}`}
                        checked={
                          t === "billing" && c === "email"
                            ? true
                            : prefs.notif[t][c]
                        }
                        disabled={t === "billing" && c === "email"}
                        onCheckedChange={(on) => {
                          if (c === "push") {
                            void ask(t, !!on)
                            return
                          }
                          setNotifCell(me.id, t, c, !!on)
                          mark("n")
                        }}
                      >
                        <Switch.Thumb />
                      </Switch.Root>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </>
  )
}

export function CalendarSettings() {
  const { me, prefs } = useApp()
  const [reveal, setReveal] = useState(false)
  const url = `webcal://my.cactuspeakathletic.example/api/calendar/${prefs.calendarToken}.ics`
  return (
    <>
      <SettingsSection
        id="set-feed"
        title="Your calendar feed"
        action={
          <Button size="sm" render={<a href={url} />}>
            Subscribe
          </Button>
        }
      >
        <SettingBlock className="gap-xs flex flex-wrap items-center">
          <IconTile icon={CalendarPlus} className="mr-xs" />
          <Input
            aria-label="Feed URL"
            readOnly
            value={
              reveal
                ? url
                : "webcal://my.cactuspeakathletic.example/api/calendar/••••••••••.ics"
            }
            className="tabular min-w-0 flex-1 basis-40"
          />
          <Button
            variant="outline"
            size="icon"
            aria-label={reveal ? "Hide feed URL" : "Reveal feed URL"}
            onClick={() => setReveal(!reveal)}
          >
            <Eye aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(url)
              toast({ title: "Link copied" })
            }}
          >
            <Copy aria-hidden="true" data-icon="inline-start" />
            Copy
          </Button>
        </SettingBlock>
        <SettingRow
          label="Reset link"
          line="Update the link in your calendar app after a reset."
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetCalendarToken()
              toast({
                title: "Calendar link reset",
                description: "Update the link in your calendar app.",
              })
            }}
          >
            Reset link
          </Button>
        </SettingRow>
      </SettingsSection>
      <Banner tone="info" title="Arizona doesn't use daylight saving.">
        Your calendar may shift times if it is set to another time zone.
        Cancelled bookings leave the feed. Held spots join it once you confirm.
      </Banner>
      <SettingsSection id="set-feed-include" title="In the feed">
        <SettingSwitch
          label="Include my household"
          checked={prefs.calIncludeHousehold}
          onChange={(c) => setPrefs(me.id, { calIncludeHousehold: c })}
        />
        <SettingSwitch
          label="Include kids club"
          icon={ChildHead}
          checked={prefs.calIncludeKids}
          onChange={(c) => setPrefs(me.id, { calIncludeKids: c })}
        />
      </SettingsSection>
    </>
  )
}

export function SecuritySettings() {
  const { prefs } = useApp()
  const router = useRouter()
  const [all, setAll] = useState(false)
  const [pw, setPw] = useState(false)
  const addPasskeyButton = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        addPasskey(`This device, ${new Date().getFullYear()}`)
        toast({ title: "Passkey added" })
      }}
    >
      Add a passkey
    </Button>
  )
  return (
    <>
      <SettingsSection
        id="set-passkeys"
        title="Passkeys"
        action={prefs.passkeys.length ? addPasskeyButton : undefined}
      >
        {prefs.passkeys.length ? (
          prefs.passkeys.map((p) => (
            <SettingRow key={p} label={p} icon={KeyRound}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove ${p}`}
                onClick={() => {
                  removePasskey(p)
                  toast({ title: "Passkey removed" })
                }}
              >
                Remove
              </Button>
            </SettingRow>
          ))
        ) : (
          <SettingRow label="No passkeys yet" icon={KeyRound}>
            {addPasskeyButton}
          </SettingRow>
        )}
      </SettingsSection>
      <SettingsSection
        id="set-password"
        title="Password"
        line="A password is optional. Use a passkey or an email code instead."
      >
        {pw ? (
          <>
            <SettingRow label="New password" icon={Lock} wide>
              {(p) => (
                <Input {...p} type="password" autoComplete="new-password" />
              )}
            </SettingRow>
            <SettingBlock className="gap-xs flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setPw(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setPw(false)
                  toast({ title: "Password saved" })
                }}
              >
                Save password
              </Button>
            </SettingBlock>
          </>
        ) : (
          <SettingRow label="Password" icon={Lock}>
            <Button size="sm" variant="outline" onClick={() => setPw(true)}>
              Set a password
            </Button>
          </SettingRow>
        )}
      </SettingsSection>
      <SettingsSection
        id="set-devices"
        title="Signed-in devices"
        action={
          <Button size="sm" variant="outline" onClick={() => setAll(true)}>
            Sign out everywhere
          </Button>
        }
      >
        {[
          ["This browser", "Chrome on Mac · Mesa, AZ · now"],
          ["iPhone", "Cactus Peak app · Gilbert, AZ · 2 hours ago"],
        ].map(([a, b]) => (
          <SettingRow
            key={a}
            label={a}
            line={b}
            icon={a === "This browser" ? Laptop : Smartphone}
          >
            {a !== "This browser" ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Sign out on ${a}`}
                onClick={() => toast({ title: "Signed out on iPhone" })}
              >
                Sign out
              </Button>
            ) : (
              <StatusPill tone="success">Current</StatusPill>
            )}
          </SettingRow>
        ))}
      </SettingsSection>
      <Confirm
        open={all}
        onOpenChange={setAll}
        title="Sign out on all devices?"
        description="You'll need to sign in again on each one."
      >
        <div className="gap-xs flex flex-col">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setAll(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={async () => {
              await signOut("global").catch(() => undefined)
              router.replace("/sign-in")
              router.refresh()
            }}
          >
            Sign out everywhere
          </Button>
        </div>
      </Confirm>
    </>
  )
}

export function DisplaySettings() {
  const { me, prefs } = useApp()
  const { setTheme } = useTheme()
  return (
    <>
      <SettingsSection id="set-theme" title="Appearance">
        <SettingRow label="Theme" icon={SunMedium} wide>
          <SelectBox
            label="Theme"
            hideLabel
            value={prefs.theme}
            onChange={(v) => {
              setTheme(v)
              setPrefs(me.id, { theme: v })
            }}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Motion" icon={Activity} wide>
          <SelectBox
            label="Motion"
            hideLabel
            value={prefs.motion}
            onChange={(v) => {
              setPrefs(me.id, { motion: v })
              document.documentElement.dataset.motion =
                v === "reduce" ? "reduce" : ""
            }}
            options={[
              { value: "system", label: "Follow my device" },
              { value: "reduce", label: "Reduce motion" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="Text size"
          icon={Accessibility}
          line="Large sets the base text to 18 px."
          wide
        >
          <SelectBox
            label="Text size"
            hideLabel
            value={prefs.textSize}
            onChange={(v) => {
              setPrefs(me.id, { textSize: v })
              document.documentElement.dataset.text =
                v === "large" ? "large" : ""
            }}
            options={[
              { value: "default", label: "Default" },
              { value: "large", label: "Large" },
            ]}
          />
        </SettingRow>
      </SettingsSection>
      <SettingsSection id="set-region" title="Time and language">
        <SettingRow label="Time format" icon={Clock}>
          <p className="text-muted-foreground">12-hour</p>
        </SettingRow>
        <SettingRow label="Language" icon={MessageSquare}>
          <p className="text-muted-foreground">English</p>
        </SettingRow>
      </SettingsSection>
    </>
  )
}

export function PrivacySettings() {
  const { me, prefs } = useApp()
  const [del, setDel] = useState(false)
  return (
    <>
      {me.role === "teen" ? (
        <Banner
          tone="info"
          title="Your parent can see your bookings and check-ins."
        />
      ) : null}
      <SettingsSection id="set-email" title="Email">
        <SettingSwitch
          label="Send me offers and club news by email"
          icon={Inbox}
          checked={prefs.marketing}
          onChange={(c) => {
            setPrefs(me.id, { marketing: c })
            toast({ title: "Saved" })
          }}
        />
      </SettingsSection>
      <SettingsSection id="set-data" title="Your data">
        <SettingRow
          label="Download my data (ZIP)"
          icon={Download}
          line="We email a link within 24 hours."
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast({
                title: "We'll email your data",
                description: "A download link arrives within 24 hours.",
              })
            }
          >
            Request
          </Button>
        </SettingRow>
      </SettingsSection>
      <SettingsSection id="set-delete" title="Delete account" tone="danger">
        <SettingRow
          label={
            me.role === "primary"
              ? "Cancel your membership first"
              : "Removes your profile and bookings"
          }
          line="This can't be undone."
        >
          <Button
            size="sm"
            variant="outline"
            className="!text-destructive"
            onClick={() => setDel(true)}
          >
            Delete
          </Button>
        </SettingRow>
      </SettingsSection>
      <Confirm
        open={del}
        onOpenChange={setDel}
        title="Delete your account?"
        description={
          me.role === "primary"
            ? "Cancel your membership first. Deleting an account with an active plan isn't possible."
            : "This removes your profile and bookings. It can't be undone."
        }
      >
        <div className="gap-xs flex flex-col">
          {me.role === "primary" ? (
            <Button className="w-full" render={<a href="/membership/cancel" />}>
              Cancel membership first
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                setDel(false)
                toast({
                  title: "Request sent",
                  description: "We'll confirm by email.",
                })
              }}
            >
              Delete my account
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setDel(false)}
          >
            Keep my account
          </Button>
        </div>
      </Confirm>
    </>
  )
}
