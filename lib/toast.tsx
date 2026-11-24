"use client"
import { Toast as BaseToast } from "@base-ui/react/toast"
import { Toast } from "@/components/graphical"
import { X } from "@/components/icons"
import { Button } from "@/components/ui/button"

export const toastManager = BaseToast.createToastManager()

export interface ToastOptions {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  /** A second button beside `action` (the booking toast's "View"). It closes the toast, then runs. */
  secondary?: { label: string; onClick: () => void }
  timeout?: number
  type?: "success" | "error" | "info"
}
export function toast(o: ToastOptions) {
  return toastManager.add({
    title: o.title,
    description: o.description,
    type: o.type ?? "success",
    timeout: o.timeout ?? (o.type === "error" ? 0 : o.action ? 10000 : 5000),
    data: o.secondary ? { secondary: o.secondary } : undefined,
    actionProps: o.action
      ? { children: o.action.label, onClick: o.action.onClick }
      : undefined,
  })
}

function secondaryOf(data: unknown) {
  return (data as { secondary?: ToastOptions["secondary"] } | undefined)
    ?.secondary
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager()
  return (
    <>
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          toast={t}
          role={t.type === "error" ? "alert" : "status"}
          className="toast-root"
        >
          <Toast.Content>
            <div className="gap-s flex items-start">
              <div className="min-w-0 flex-1">
                <Toast.Title className="text-body-s font-heavy" />
                <Toast.Description className="text-body-s text-muted-foreground" />
              </div>
              <Toast.Close
                aria-label="Dismiss notification"
                className="-m-s corner-s grid size-11 shrink-0 place-items-center hover:bg-muted"
              >
                <X className="size-4" aria-hidden="true" />
              </Toast.Close>
            </div>
            {t.actionProps ? (
              <div className="gap-xs flex items-center self-start">
                <Toast.Action className="max-md:min-h-11" />
                {secondaryOf(t.data) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const sec = secondaryOf(t.data)
                      toastManager.close(t.id)
                      sec?.onClick()
                    }}
                  >
                    {secondaryOf(t.data)?.label}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Toast.Content>
        </Toast.Root>
      ))}
    </>
  )
}

export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}
