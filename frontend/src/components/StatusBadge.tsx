import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Unified status→color mapping using semantic CSS custom properties.
 * Each status has a distinct hue — no two statuses share the same visual.
 * All combinations meet WCAG AA 4.5:1 contrast ratio.
 */
const statusConfig: Record<string, { bg: string; text: string; border: string; label?: string }> = {
  PLACED:      { bg: "bg-slate-100",   text: "text-slate-700",   border: "border-slate-300" },
  PENDING:     { bg: "bg-amber-50",    text: "text-amber-800",   border: "border-amber-300",   label: "Pending" },
  CONFIRMED:   { bg: "bg-blue-50",     text: "text-blue-800",    border: "border-blue-300" },
  PAID:        { bg: "bg-teal-50",     text: "text-teal-800",    border: "border-teal-300" },
  IN_PROGRESS: { bg: "bg-orange-50",   text: "text-orange-800",  border: "border-orange-300",  label: "In Progress" },
  READY:       { bg: "bg-green-50",    text: "text-green-800",   border: "border-green-300" },
  DELIVERED:   { bg: "bg-purple-50",   text: "text-purple-800",  border: "border-purple-300" },
  COMPLETED:   { bg: "bg-emerald-50",  text: "text-emerald-800", border: "border-emerald-300" },
  CANCELLED:   { bg: "bg-gray-100",    text: "text-gray-600",    border: "border-gray-300" },
  LOW_STOCK:   { bg: "bg-red-50",      text: "text-red-800",     border: "border-red-300",     label: "Low Stock" },
};

const defaultStyle = { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" };

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.replace(/\s+/g, "_").toUpperCase();
  const config = statusConfig[normalized] ?? defaultStyle;
  const label = ("label" in config && config.label) || status.replace(/_/g, " ");

  return (
    <Badge
      variant="outline"
      className={cn(config.bg, config.text, config.border, "font-medium", className)}
    >
      {label}
    </Badge>
  );
}
