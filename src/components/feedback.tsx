import { AlertCircleIcon, InboxIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <InboxIcon aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-8 text-center">
      <AlertCircleIcon className="text-destructive" aria-hidden="true" />
      <div>
        <h2 className="font-semibold">Couldn&apos;t load this page</h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {retry ? (
        <Button variant="outline" onClick={retry}>
          <RotateCcwIcon data-icon="inline-start" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
