import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BookingStatus, MembershipStatus, PaymentStatus } from "@/lib/domain"

const labels: Record<MembershipStatus | BookingStatus | PaymentStatus, string> = {
  active: "Active",
  expiring: "Expiring",
  expired: "Expired",
  paid: "Paid",
  pending: "Pending",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
}

export function StatusBadge({
  status,
  className,
}: {
  status: MembershipStatus | BookingStatus | PaymentStatus
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-semibold",
        (status === "active" || status === "paid" || status === "completed") &&
          "bg-success-soft text-success",
        (status === "expiring" || status === "pending" || status === "scheduled") &&
          "bg-warning-soft text-warning",
        (status === "expired" || status === "cancelled") &&
          "bg-danger-soft text-destructive",
        className,
      )}
    >
      {labels[status]}
    </Badge>
  )
}
