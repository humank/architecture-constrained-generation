import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  PLACED: "bg-gray-100 text-gray-800 border-gray-200",
  PENDING: "bg-gray-100 text-gray-800 border-gray-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
  READY: "bg-amber-100 text-amber-800 border-amber-200",
  DELIVERED: "bg-purple-100 text-purple-800 border-purple-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] ?? "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <Badge
      variant="outline"
      className={cn(colorClass, className)}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
