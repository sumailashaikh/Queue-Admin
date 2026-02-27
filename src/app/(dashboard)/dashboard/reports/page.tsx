import { useLanguage } from "@/context/LanguageContext";

export default function ReportsPage() {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
            <p className="text-slate-600">{t('reports.coming_soon')}</p>
        </div>
    );
}
