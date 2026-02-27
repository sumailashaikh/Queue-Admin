import { cn } from "@/lib/utils";
import { useLanguage } from '@/context/LanguageContext';

// Global UI Tokens
export const UI_TOKENS = {
    colors: {
        primary: '#0B1B3F',
        whatsapp: '#25D366',
        whatsappHover: '#1ebe5d',
    },
    radius: {
        button: 'rounded-xl',
        card: 'rounded-[32px]',
        badge: 'rounded-full',
    },
    spacing: {
        rowGap: 'mb-4',
    }
};

// Shared Status Badge Configuration
export type StatusType = 'waiting' | 'serving' | 'completed' | 'no_show' | 'skipped' | 'confirmed' | 'unpaid' | 'paid' | 'upcoming';

interface StatusBadgeProps {
    status: StatusType | string;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
    const { t } = useLanguage();
    const s = status.toLowerCase();

    const config: Record<string, { bg: string, text: string, label: string }> = {
        waiting: { bg: 'bg-slate-100', text: 'text-slate-500', label: t('status.waiting') },
        serving: { bg: 'bg-blue-50', text: 'text-blue-700', label: t('status.serving') },
        completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: t('status.completed') },
        no_show: { bg: 'bg-rose-50', text: 'text-rose-700', label: t('status.no_show') },
        skipped: { bg: 'bg-amber-50', text: 'text-amber-700', label: t('status.skipped') },
        confirmed: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: t('status.confirmed') },
        upcoming: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: t('status.upcoming') },
        unpaid: { bg: 'bg-amber-50', text: 'text-amber-700', label: t('status.unpaid') },
        paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: t('status.paid') },
    };

    const style = config[s] || { bg: 'bg-slate-100', text: 'text-slate-500', label: s.toUpperCase() };

    return (
        <div className={cn(
            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-black/5 whitespace-nowrap flex items-center gap-1.5",
            style.bg,
            style.text,
            className
        )}>
            {(['serving', 'waiting'].includes(s)) && (
                <div className={cn(
                    "h-1 w-1 rounded-full animate-pulse",
                    s === 'serving' ? "bg-blue-600" : "bg-amber-600"
                )} />
            )}
            {style.label}
        </div>
    );
};
