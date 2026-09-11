import { DumbbellIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-label="PLAT GYM">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <DumbbellIcon aria-hidden="true" />
      </span>
      {compact ? null : (
        <span className="font-display text-2xl font-bold tracking-[0.08em] text-sidebar-foreground">
          PLAT GYM
        </span>
      )}
    </div>
  )
}
