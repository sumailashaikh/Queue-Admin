import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

// Global UI Tokens
export const UI_TOKENS = {
  colors: {
    primary: "#0B1B3F",
    whatsapp: "#25D366",
    whatsappHover: "#1ebe5d",
  },
  radius: {
    button: "rounded-xl",
    card: "rounded-[32px]",
    badge: "rounded-full",
  },
  spacing: {
    rowGap: "mb-4",
  },
};

// Shared Status Badge Configuration
export type StatusType =
  | "waiting"
  | "serving"
  | "completed"
  | "no_show"
  | "skipped"
  | "confirmed"
  | "unpaid"
  | "paid"
  | "upcoming"
  | "needs_attention";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
}) => {
  const { t } = useLanguage();
  const raw = status.toLowerCase();
  const s = raw.startsWith("status.") ? raw.split(".")[1] : raw;
  const tSafe = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const config: Record<string, { bg: string; text: string; label: string }> = {
    waiting: {
      bg: "bg-slate-100",
      text: "text-slate-500",
      label: tSafe("status.waiting", "Waiting"),
    },
    serving: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      label: tSafe("status.serving", "Serving"),
    },
    in_service: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      label: tSafe("status.serving", "Serving"),
    },
    running: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      label: tSafe("status.running", "Running"),
    },
    completed: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      label: tSafe("status.completed", "Completed"),
    },
    no_show: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      label: tSafe("status.no_show", "No-Show"),
    },
    skipped: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: tSafe("status.skipped", "Skipped"),
    },
    confirmed: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      label: tSafe("status.confirmed", "Confirmed"),
    },
    scheduled: {
      bg: "bg-slate-100",
      text: "text-slate-600",
      label: tSafe("status.scheduled", "Scheduled"),
    },
    upcoming: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      label: tSafe("status.upcoming", "Upcoming"),
    },
    unpaid: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: tSafe("status.unpaid", "Unpaid"),
    },
    paid: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      label: tSafe("status.paid", "Paid"),
    },
    checked_in: {
      bg: "bg-blue-600",
      text: "text-white",
      label: tSafe("status.checked_in", "Checked In"),
    },
    expired: {
      bg: "bg-slate-200",
      text: "text-slate-500",
      label: tSafe("status.expired", "Expired"),
    },
    late: {
      bg: "bg-amber-500",
      text: "text-white",
      label: tSafe("status.late", "Late"),
    },
    in_queue: {
      bg: "bg-blue-600",
      text: "text-white",
      label: tSafe("status.in_queue", "In Queue"),
    },
    needs_attention: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: tSafe("status.needs_attention", "Needs Attention"),
    },
  };

  const style = config[s] || {
    bg: "bg-slate-100",
    text: "text-slate-500",
    label: s.toUpperCase(),
  };

  return (
    <div
      className={cn(
        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-black/5 whitespace-nowrap flex items-center gap-1.5",
        style.bg,
        style.text,
        className,
      )}
    >
      {["serving", "waiting"].includes(s) && (
        <div
          className={cn(
            "h-1 w-1 rounded-full animate-pulse",
            s === "serving" ? "bg-blue-600" : "bg-amber-600",
          )}
        />
      )}
      {style.label}
    </div>
  );
};
