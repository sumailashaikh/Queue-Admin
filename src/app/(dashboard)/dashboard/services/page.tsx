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
    ShieldCheck,
    Pencil
} from "lucide-react";
import { serviceService, Service } from "@/services/serviceService";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatCurrency, validateLanguage } from "@/lib/utils";
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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

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
        price: 0
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
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchServices, 30000);
        return () => clearInterval(interval);
    }, [fetchServices]);

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedName = newService.name.trim();

        // Validation: Required fields
        if (!trimmedName || !newService.description.trim() || newService.duration_minutes === undefined || newService.price === undefined) {
            setError(t('services.all_fields_required'));
            return;
        }

        // Validation: Non-negative
        if (newService.duration_minutes < 0 || newService.price < 0) {
            setError(t('services.err_negative_values')); 
            return;
        }

        // Validation: Language Guard
        if (!validateLanguage(trimmedName, language) || !validateLanguage(newService.description, language)) {
            setError(t('common.err_invalid_chars'));
            return;
        }

        // Validation: Duplicate Name
        const isDuplicate = services.some(s => s.name.trim().toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
            setError(t('services.err_duplicate'));
            return;
        }

        setIsSubmitting(true);
        try {
            await serviceService.createService({ ...newService, name: trimmedName, business_id: business?.id });
            await fetchServices();
            setIsAddModalOpen(false);
            setNewService({
                name: "",
                description: "",
                duration_minutes: 30,
                price: 0
            });
            showToast(t('services.success_add'));
        } catch (err: any) {
            setError(err.message || t('services.err_add'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingService) return;

        setError(null);

        const trimmedName = editingService.name.trim();

        // Find original service to compare
        const originalService = services.find(s => s.id === editingService.id);

        // Validation: Required fields
        if (!trimmedName || !editingService.description.trim() || editingService.duration_minutes === undefined || editingService.price === undefined) {
            setError(t('services.all_fields_required'));
            return;
        }

        // Validation: Non-negative
        if (editingService.duration_minutes < 0 || editingService.price < 0) {
            setError(t('services.err_negative_values'));
            return;
        }

        // Validation: Language Guard
        if (!validateLanguage(trimmedName, language) || !validateLanguage(editingService.description, language)) {
            setError(t('common.err_invalid_chars'));
            return;
        }

        // Validation: No changes detected
        if (originalService) {
            const hasChanges = 
                trimmedName !== originalService.name ||
                editingService.description.trim() !== originalService.description ||
                editingService.duration_minutes !== originalService.duration_minutes ||
                editingService.price !== originalService.price;
            
            if (!hasChanges) {
                setError(t('services.no_changes_detected'));
                return;
            }
        }

        // Validation: Duplicate Name (excluding self)
        const isDuplicate = services.some(s => s.id !== editingService.id && s.name.trim().toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
            setError(t('services.err_duplicate'));
            return;
        }

        setIsSubmitting(true);
        try {
            await serviceService.updateService(editingService.id, { ...editingService, name: trimmedName });
            await fetchServices();
            setIsEditModalOpen(false);
            setEditingService(null);
            showToast(t('services.success_update'));
        } catch (err: any) {
            setError(err.message || t('services.err_update'));
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
        return service.name;
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
            {/* Custom Toast Notification */}
            {toast && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-10 duration-500">
                    <div className={cn(
                        "flex items-center gap-3 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border backdrop-blur-md",
                        toast.type === 'success' ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-rose-500/90 border-rose-400 text-white"
                    )}>
                        {toast.type === 'success' ? <ShieldCheck className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <p className="text-xs font-black uppercase tracking-wider">{toast.message}</p>
                    </div>
                </div>
            )}
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        {t('services.title')}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-wider font-semibold">
                        {t('services.subtitle')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-72 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={t('services.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setError(null);
                            setNewService({
                                name: "",
                                description: "",
                                duration_minutes: 30,
                                price: 0
                            });
                            setIsAddModalOpen(true);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 group"
                    >
                        <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                        {t('services.new_service')}
                    </button>
                </div>
            </div>

            {/* Grid Section */}
            {filteredServices.length === 0 ? (
                <div className="py-32 text-center space-y-8 bg-slate-50/50 rounded-[40px] border-4 border-dashed border-slate-100">
                    <div className="h-28 w-28 bg-white rounded-[40px] flex items-center justify-center mx-auto shadow-xl border border-slate-100 relative grayscale opacity-50">
                        <LayoutGrid className="h-12 w-12 text-slate-300" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t('services.empty_workspace')}</p>
                        <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto leading-relaxed">
                            {t('services.no_match')}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className="group relative bg-white border-2 border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:border-blue-500/10 transition-all duration-500 flex flex-col justify-between gap-6 overflow-hidden animate-in fade-in zoom-in-95"
                        >
                            <div className="relative space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="h-14 w-14 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm border border-blue-100/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                        <Sparkles className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-2 translate-x-2 -translate-y-2">
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                setEditingService(service);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                                            title="Edit Service"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteModal({ isOpen: true, serviceId: service.id, serviceName: service.name, error: null })}
                                            className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                                            title="Delete Service"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                        {getDisplayName(service)}
                                    </h3>
                                    {/* Removed translation subtitle */}
                                    <p className="text-xs font-semibold text-slate-500/70 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                                        {service.description || t('services.default_desc')}
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 shadow-inner">
                                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">{service.duration_minutes} {t('queue.min')}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-0.5">{t('services.price_label')}</span>
                                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(service.price, business?.currency, language)}</span>
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

            {/* Edit Service Modal */}
            {isEditModalOpen && editingService && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-white/95 backdrop-blur-2xl w-full max-w-2xl rounded-[40px] shadow-[0_32px_96px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white flex flex-col max-h-[90vh]">
                        <div className="px-8 py-8 md:py-10 border-b border-slate-100/50 bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-start justify-between shrink-0">
                            <div className="space-y-1.5 text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider shadow-inner mb-2 border border-blue-100/50">
                                    <Pencil className="h-3.5 w-3.5" />
                                    {t('common.edit')}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('services.save_changes')}</h2>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{t('services.subtitle')}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-white hover:bg-rose-50 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 transition-all active:scale-90 hover:rotate-90 group">
                                <X className="h-5 w-5 group-hover:drop-shadow-sm" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-8 space-y-8 text-left">
                            {error && (
                                <div className="p-5 bg-rose-50 border border-rose-100/50 rounded-2xl flex items-center gap-4 text-rose-600 shadow-sm animate-in slide-in-from-top-2">
                                    <AlertCircle className="h-5 w-5 text-rose-500" />
                                    <p className="text-sm font-semibold">{error}</p>
                                </div>
                            )}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('services.name_label')}</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder={t('services.name_placeholder')}
                                        value={editingService.name}
                                        onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-base font-bold text-slate-900 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('services.duration_label')}</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={editingService.duration_minutes}
                                            onChange={(e) => setEditingService({ ...editingService, duration_minutes: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-base font-bold text-slate-900 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('services.price_label')} ({business?.currency || '₹'})</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={editingService.price}
                                            onChange={(e) => setEditingService({ ...editingService, price: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-emerald-500 rounded-[24px] text-base font-bold text-slate-900 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('services.desc_label')}</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder={t('services.desc_placeholder')}
                                        value={editingService.description}
                                        onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-sm font-bold text-slate-900 outline-none transition-all shadow-sm resize-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-100 flex justify-end items-center gap-4 sticky bottom-0 bg-white/95 pb-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-8 py-4 bg-slate-100 text-slate-500 border-2 border-slate-100 hover:bg-slate-200 hover:text-slate-700 hover:border-slate-300 rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95">{t('common.cancel')}</button>
                                <button disabled={isSubmitting} onClick={handleEditService} className="px-10 py-4 bg-slate-900 text-white rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                                    {t('services.save_changes')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Service Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-white/95 backdrop-blur-2xl w-full max-w-2xl rounded-[40px] shadow-[0_32px_96px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white flex flex-col max-h-[90vh]">
                        <div className="px-8 py-8 md:py-10 border-b border-slate-100/50 bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-start justify-between shrink-0">
                            <div className="space-y-1.5 text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider shadow-inner mb-2 border border-blue-100/50">
                                    <Plus className="h-3.5 w-3.5" />
                                    {t('services.new_service')}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('services.create_service')}</h2>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{t('services.add_subtitle')}</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-white hover:bg-rose-50 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 transition-all active:scale-90 hover:rotate-90 group">
                                <X className="h-5 w-5 group-hover:drop-shadow-sm" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-8 space-y-8 text-left">
                            {error && (
                                <div className="p-5 bg-rose-50 border border-rose-100/50 rounded-2xl flex items-center gap-4 text-rose-600 shadow-sm animate-in slide-in-from-top-2">
                                    <AlertCircle className="h-5 w-5 text-rose-500" />
                                    <p className="text-sm font-semibold">{error}</p>
                                </div>
                            )}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('services.name_label')}</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder={t('services.name_placeholder')}
                                        value={newService.name}
                                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-base font-bold text-slate-900 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('services.duration_label')}</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={newService.duration_minutes}
                                            onChange={(e) => setNewService({ ...newService, duration_minutes: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-base font-bold text-slate-900 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('services.price_label')} ({business?.currency || '₹'})</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={newService.price}
                                            onChange={(e) => setNewService({ ...newService, price: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-emerald-500 rounded-[24px] text-base font-bold text-slate-900 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('services.desc_label')}</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder={t('services.desc_placeholder')}
                                        value={newService.description}
                                        onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 border-2 border-transparent focus:border-blue-500 rounded-[24px] text-sm font-bold text-slate-900 outline-none transition-all shadow-sm resize-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-100 flex justify-end items-center gap-4 sticky bottom-0 bg-white/95 pb-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-8 py-4 bg-slate-100 text-slate-500 border-2 border-slate-100 hover:bg-slate-200 hover:text-slate-700 hover:border-slate-300 rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95">{t('common.cancel')}</button>
                                <button disabled={isSubmitting} onClick={handleAddService} className="px-10 py-4 bg-slate-900 text-white rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                                    {t('services.create_service')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
