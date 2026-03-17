"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Trash2 as TrashIcon,
    Clock,
    Tag,
    Loader2,
    X,
    AlertCircle,
    LayoutGrid,
    Search,
    Sparkles,
    Settings2,
    ShieldCheck
} from "lucide-react";
import { serviceService, Service } from "@/services/serviceService";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

// Custom Delete Dialog
function DeleteDialog({ isOpen, onClose, onConfirm, serviceName, isDeleting, error }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    serviceName: string;
    isDeleting: boolean;
    error: string | null;
}) {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50">
                <div className="p-8 text-center space-y-6">
                    <div className="h-20 w-20 bg-red-50 rounded-[28px] flex items-center justify-center mx-auto text-red-600 transition-transform hover:scale-110 duration-500">
                        <TrashIcon className="h-10 w-10" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-xl font-bold text-slate-900">{t('services.delete_title')}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {t('services.delete_desc', { name: serviceName })}
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-semibold animate-in slide-in-from-top-4">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            disabled={isDeleting}
                            onClick={onConfirm}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-500/10 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('services.confirm_delete')}
                        </button>
                        <button
                            disabled={isDeleting}
                            onClick={onClose}
                            className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ServicesPage() {
    const { business } = useAuth();
    const { t, language } = useLanguage();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; serviceId: string; serviceName: string; error: string | null }>({
        isOpen: false,
        serviceId: "",
        serviceName: "",
        error: null
    });
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [newService, setNewService] = useState({
        name: "",
        description: "",
        duration_minutes: 30,
        price: 0,
        translations: {
            hi: "",
            es: "",
            ar: ""
        }
    });

    const fetchServices = useCallback(async () => {
        try {
            const data = await serviceService.getMyServices();
            setServices(data || []);
        } catch (err) {
            console.error("Failed to fetch services:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business?.id) return;

        setIsSubmitting(true);
        setError(null);
        const cleanedService = {
            ...newService,
            name: newService.name.trim(),
            description: newService.description.trim(),
            business_id: business.id
        };

        if (!cleanedService.name) {
            setError(t('services.name_placeholder')); // Or a better "Name is required" key if exists
            setIsSubmitting(false);
            return;
        }

        try {
            await serviceService.createService(cleanedService);
            await fetchServices();
            setIsAddModalOpen(false);
            setNewService({
                name: "",
                description: "",
                duration_minutes: 30,
                price: 0,
                translations: { hi: "", es: "", ar: "" }
            });
        } catch (err: any) {
            let msg = err.message || "Failed to add service";
            if (msg.includes("already exists")) {
                msg = t('services.err_duplicate');
            }
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal.serviceId) return;

        setIsDeleting(true);
        setDeleteModal(prev => ({ ...prev, error: null }));
        try {
            await serviceService.deleteService(deleteModal.serviceId);
            setServices(prev => prev.filter(s => s.id !== deleteModal.serviceId));
            setDeleteModal({ isOpen: false, serviceId: "", serviceName: "", error: null });
        } catch (err: any) {
            console.error("Delete failed:", err);
            const msg = err.response?.status === 404 ? t('services.delete_error') : t('services.delete_fail');
            setDeleteModal(prev => ({ ...prev, error: msg }));
        } finally {
            setIsDeleting(false);
        }
    };

    const getDisplayName = (service: Service) => {
        if (service.translations && service.translations[language]) {
            return service.translations[language];
        }
        return service.name;
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.translations && Object.values(s.translations).some(v => v.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <Sparkles className="h-4 w-4 text-primary/80 absolute -bottom-1 -right-1 animate-pulse" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse">{t('services.syncing')}</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        {t('services.title')}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-wider font-semibold">
                        {t('services.subtitle')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-64 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('services.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-slate-800 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        {t('services.new_service')}
                    </button>
                </div>
            </div>

            {/* Grid Section */}
            {filteredServices.length === 0 ? (
                <div className="pro-card py-32 text-center space-y-8 bg-white/50 backdrop-blur-sm">
                    <div className="h-28 w-28 bg-slate-100 rounded-[40px] flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                        <LayoutGrid className="h-12 w-12 text-slate-300" />
                    </div>
                    <div className="space-y-3">
                        <p className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{t('services.empty_workspace')}</p>
                        <p className="text-sm font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
                            {t('services.no_match')}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className="group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4 overflow-hidden"
                        >

                            <div className="relative space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: true, serviceId: service.id, serviceName: service.name, error: null })}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Service"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                                        {getDisplayName(service)}
                                    </h3>
                                    {service.translations && service.translations[language] && (
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {t('services.original')}{service.name}
                                        </p>
                                    )}
                                    <p className="mt-1 text-sm text-slate-500 leading-relaxed line-clamp-2">
                                        {service.description || t('services.default_desc')}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-md border border-slate-200 text-slate-600">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="text-xs font-semibold">{service.duration_minutes} min</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-semibold text-slate-400 mb-0.5">{t('services.price_label')}</span>
                                        <span className="text-xl font-bold text-slate-900 tracking-tight">{formatCurrency(service.price, business?.currency, language)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <DeleteDialog
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                serviceName={deleteModal.serviceName}
                isDeleting={isDeleting}
                error={deleteModal.error}
            />

            {/* Add Service Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-white/95 backdrop-blur-2xl w-full max-w-2xl rounded-[40px] shadow-[0_32px_96px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white flex flex-col max-h-[90vh]">
                        {/* Premium Header */}
                        <div className="px-8 py-8 md:py-10 border-b border-slate-100/50 bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-start justify-between shrink-0">
                            <div className="space-y-1.5">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-inner mb-2 border border-blue-100/50">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Portfolio Setup
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{t('services.new_service')}</h2>
                                <p className="text-sm font-bold text-slate-500/80 tracking-tight">{t('services.add_subtitle')}</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-3 bg-white hover:bg-rose-50 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 transition-all active:scale-90 hover:rotate-90 group"
                            >
                                <X className="h-5 w-5 group-hover:drop-shadow-sm" />
                            </button>
                        </div>

                        {/* Form Body - Scrollable */}
                        <div className="overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
                            <form onSubmit={handleAddService} className="p-8 space-y-8">
                                {error && (
                                    <div className="p-5 bg-rose-50 border border-rose-100/50 rounded-2xl flex items-center gap-4 text-rose-600 shadow-sm animate-in slide-in-from-top-2">
                                        <div className="p-2 bg-white rounded-xl shadow-sm">
                                            <AlertCircle className="h-5 w-5 text-rose-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black uppercase tracking-widest mb-0.5">Integration Error</p>
                                            <p className="text-sm font-semibold">{error}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {/* Service Name */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('services.name_placeholder')}</label>
                                        <input
                                            required
                                            type="text"
                                            value={newService.name}
                                            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:bg-white outline-none transition-all shadow-sm"
                                            placeholder={t('services.name_placeholder')}
                                        />
                                    </div>

                                    {/* Duration + Price */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('services.duration_label')}</label>
                                            <div className="relative group">
                                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                                <input
                                                    required
                                                    type="number"
                                                    value={newService.duration_minutes || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setNewService({ ...newService, duration_minutes: val === "" ? 0 : parseInt(val) });
                                                    }}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:bg-white outline-none transition-all shadow-sm"
                                                    placeholder="30"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('services.price_label')}</label>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-emerald-500 transition-colors text-xs">{business?.currency || '₹'}</span>
                                                <input
                                                    required
                                                    type="number"
                                                    value={newService.price || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setNewService({ ...newService, price: val === "" ? 0 : parseInt(val) });
                                                    }}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-emerald-500 rounded-[24px] text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:bg-white outline-none transition-all shadow-sm"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('services.desc_label')}</label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={newService.description}
                                            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:bg-white outline-none transition-all shadow-sm resize-none"
                                            placeholder={t('services.desc_placeholder')}
                                        />
                                    </div>
                                </div>


                                {/* Actions Footer */}
                                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md pb-4 z-10">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="px-6 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        disabled={isSubmitting}
                                        type="submit"
                                        className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[20px] text-xs font-black uppercase tracking-widest transition-all shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Sparkles className="h-4 w-4 text-blue-400" />
                                                {t('services.activate')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
