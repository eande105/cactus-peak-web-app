"use client"
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Search } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * A command menu with the composition of the shadcn `command` component (ui.shadcn.com/docs/components/command):
 *
 *   Command
 *   ├── CommandInput
 *   └── CommandList
 *       ├── CommandEmpty
 *       ├── CommandGroup
 *       │   └── CommandItem
 *       ├── CommandSeparator
 *       └── CommandGroup
 *
 * It follows cmdk's behaviour (the library shadcn's component wraps) without adding it: focus stays in the input,
 * which is a combobox; the list is a listbox of groups; the active item is `aria-activedescendant`. Arrow keys move
 * and wrap, Home and End jump, Enter selects, and the active item scrolls into view. The caller filters the items
 * (this app reads day words such as "sat yoga"), so the component does not.
 */

type Ctx = {
  listId: string
  active: string | undefined
  setActive: (id: string | undefined) => void
  listRef: React.RefObject<HTMLDivElement | null>
  empty: boolean
}
const CommandContext = createContext<Ctx | null>(null)
const useCommand = () => {
  const c = useContext(CommandContext)
  if (!c) throw new Error("Command parts must sit inside <Command>.")
  return c
}

const options = (list: HTMLElement | null) =>
  list
    ? [
        ...list.querySelectorAll<HTMLElement>(
          '[role="option"]:not([aria-disabled="true"])'
        ),
      ]
    : []

export function Command({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const listId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string | undefined>()
  const [empty, setEmpty] = useState(false)

  // After every render: keep the active item on a real option (the first one when the results change), track
  // whether there are any results, and keep the active item in view.
  useLayoutEffect(() => {
    const all = options(listRef.current)
    setEmpty(all.length === 0)
    const current = all.find((o) => o.id === active)
    if (!current) {
      setActive(all[0]?.id)
      return
    }
    // The first item of a group brings its heading into view too, and the first item of the list scrolls to the top.
    if (current === all[0] && listRef.current) listRef.current.scrollTop = 0
    else {
      const group = current.closest<HTMLElement>('[role="group"]')
      if (group && options(group)[0] === current)
        group.firstElementChild?.scrollIntoView({ block: "nearest" })
    }
    current.scrollIntoView({ block: "nearest" })
  })

  return (
    <CommandContext.Provider
      value={{ listId, active, setActive, listRef, empty }}
    >
      <div
        data-slot="command"
        className={cn("flex min-h-0 flex-col", className)}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

export function CommandInput({
  label,
  placeholder,
  value,
  onValueChange,
  className,
}: {
  /** The accessible name of the field. */
  label: string
  placeholder?: string
  value: string
  onValueChange: (v: string) => void
  className?: string
}) {
  const { listId, active, setActive, listRef } = useCommand()
  const move = useCallback(
    (to: (i: number, n: number) => number) => {
      const all = options(listRef.current)
      if (!all.length) return
      const i = all.findIndex((o) => o.id === active)
      setActive(all[to(i, all.length)]?.id)
    },
    [active, listRef, setActive]
  )
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Keys typed while an input method composes a character belong to the composition.
    if (e.nativeEvent.isComposing) return
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault()
      move((i, n) => (i + 1) % n)
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault()
      move((i, n) => (i <= 0 ? n - 1 : i - 1))
    } else if (e.key === "Home") {
      e.preventDefault()
      move(() => 0)
    } else if (e.key === "End") {
      e.preventDefault()
      move((_, n) => n - 1)
    } else if (e.key === "Enter" && active) {
      e.preventDefault()
      document.getElementById(active)?.click()
    }
  }
  return (
    <div
      data-slot="command-input-wrapper"
      className={cn(
        "gap-xs px-s flex items-center corner-s bg-muted/60",
        className
      )}
    >
      <Search
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        // biome-ignore lint/a11y/noAutofocus: a command menu opens ready to type
        autoFocus
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={active}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="h-11 min-w-0 flex-1 bg-transparent text-body-m outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

export function CommandList({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  const { listId, listRef } = useCommand()
  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={label}
      data-slot="command-list"
      className={cn(
        "max-h-[min(55vh,26rem)] overflow-y-auto overscroll-contain pt-xs",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Shows only when the list has no items. */
export function CommandEmpty({ children }: { children: ReactNode }) {
  const { empty } = useCommand()
  if (!empty) return null
  return (
    <div
      role="presentation"
      data-slot="command-empty"
      className="px-s py-l text-center text-body-s"
    >
      {children}
    </div>
  )
}

export function CommandGroup({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  const id = useId()
  return (
    // biome-ignore lint/a11y/useSemanticElements: inside a listbox, ARIA groups options with role="group"; a fieldset is for form controls
    <div role="group" aria-labelledby={id} data-slot="command-group">
      <div
        id={id}
        aria-hidden="true"
        className="px-s pt-s pb-xxs eyebrow text-muted-foreground"
      >
        {heading}
      </div>
      {children}
    </div>
  )
}

export function CommandSeparator() {
  return (
    <hr
      data-slot="command-separator"
      className="-mx-xs my-xs h-px border-0 bg-border"
    />
  )
}

export function CommandItem({
  onSelect,
  disabled,
  children,
  className,
}: {
  onSelect: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  const { active, setActive } = useCommand()
  const id = useId()
  const selected = active === id
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: focus stays in the combobox input; the option is reached through aria-activedescendant
    // biome-ignore lint/a11y/useKeyWithClickEvents: the combobox input handles the keys for every option
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-slot="command-item"
      onPointerMove={() => !disabled && !selected && setActive(id)}
      onClick={() => !disabled && onSelect()}
      className={cn(
        "gap-s px-s py-xs flex min-h-11 cursor-pointer items-center corner-s select-none",
        "aria-selected:bg-accent aria-disabled:pointer-events-none aria-disabled:text-disabled-foreground",
        "[&_svg]:shrink-0",
        className
      )}
    >
      {children}
    </div>
  )
}
