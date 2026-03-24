"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    Plus,
    Search,
    MoreVertical,
    Loader2,
    X,
    UserPlus,
    Phone,
    Briefcase,
    CheckCircle2,
    CalendarOff,
    User,
    Settings,
    Clock,
    Trash2,
    BarChart3,
    AlertCircle,
    MessageSquare
} from "lucide-react";
import { cn, formatCurrency, validateLanguage } from "@/lib/utils";
import { CountryPhoneInput } from "@/components/CountryPhoneInput";
import { useAuth } from "@/hooks/useAuth";
import { providerService, ServiceProvider } from "@/services/providerService";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export default function ProvidersPage() {
    const { business } = useAuth();
    const { t, language } = useLanguage();
    const [providers, setProviders] = useState<ServiceProvider[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
    const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
    const [availabilityData, setAvailabilityData] = useState<any[]>([]);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; provider: ServiceProvider | null }>({ isOpen: false, provider: null });

    // Leaves State
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [leavesData, setLeavesData] = useState<any[]>([]);
    const [leaveFormData, setLeaveFormData] = useState({ start_date: "", end_date: "", leave_type: "holiday", note: "" });

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        role: "",
        department: ""
    });

    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchProviders = useCallback(async () => {
        if (!business?.id) return;
        try {
            const data = await providerService.getProviders(business.id);
            // Enhance providers with their services (since we want to show chips)
            // Ideally backend returns this, but if not, we map from 'services' or fetch independently
            // For now, let's assume we need to join them if not present.
            setProviders(data);
        } catch (error) {
            console.error("Failed to fetch providers:", error);
        } finally {
            setLoading(false);
        }
    }, [business?.id]);

    const fetchServices = useCallback(async () => {
        if (!business?.id) return;
        try {
            const result = await api.get<any[]>(`/businesses/${business.id}/services`);
            setServices(result.data || []);
        } catch (error) {
            console.error("Failed to fetch services:", error);
        }
    }, [business?.id]);

    useEffect(() => {
        fetchProviders();
        fetchServices();

        const interval = setInterval(() => {
            fetchProviders();
            fetchServices();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchProviders, fetchServices]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedName = formData.name.trim();
        const trimmedRole = formData.role.trim();
        const trimmedDept = formData.department.trim();
        const trimmedPhone = formData.phone.trim();

        // Validation: Required fields (Check if phone has more than just a dial code)
        const isPhoneValid = trimmedPhone.length > 4 && /\d$/.test(trimmedPhone);

        if (!trimmedName || !trimmedRole || !trimmedDept || !isPhoneValid) {
            setError(t('providers.all_fields_required'));
            return;
        }

        // Validation: Language Guard (Moved to top for better feedback)
        if (!validateLanguage(trimmedName, language) || !validateLanguage(trimmedRole, language) || !validateLanguage(trimmedDept, language)) {
            setError(t('common.err_invalid_chars'));
            return;
        }

        // Validation: Duplicate Name
        const isDuplicate = providers.some(p => 
            p.name.trim().toLowerCase() === trimmedName.toLowerCase() && 
            (!selectedProvider || p.id !== selectedProvider.id)
        );
        if (isDuplicate) {
            setError(t('providers.already_exists'));
            return;
        }

        setIsSubmitting(true);
        try {
            if (selectedProvider) {
                // Change Detection
                const hasChanges =
                    trimmedName !== selectedProvider.name ||
                    trimmedPhone !== (selectedProvider.phone || "") ||
                    trimmedRole !== (selectedProvider.role || "") ||
                    trimmedDept !== (selectedProvider.department || "");

                if (!hasChanges) {
                    setError(t('providers.no_changes_detected'));
                    setIsSubmitting(false);
                    return;
                }

                await providerService.updateProvider(selectedProvider.id, {
                    ...formData,
                    name: trimmedName,
                    role: trimmedRole,
                    department: trimmedDept,
                    phone: trimmedPhone
                });
                showToast(t('providers.success_update'));
            } else {
                // (Language guard already performed at top)

                await providerService.createProvider({
                    ...formData,
                    name: trimmedName,
                    role: trimmedRole,
                    department: trimmedDept,
                    phone: trimmedPhone,
                    business_id: business?.id,
                    is_active: true
                });
                showToast(t('providers.success_add'));
            }
            await fetchProviders();
            setIsModalOpen(false);
            setFormData({ name: "", phone: "", role: "", department: "" });
            setSelectedProvider(null);
        } catch (error: any) {
            showToast(t('providers.err_save'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (provider: ServiceProvider) => {
        setError(null);
        setSelectedProvider(provider);
        setFormData({
            name: provider.name,
            phone: provider.phone || "",
            role: provider.role || "",
            department: provider.department || ""
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (provider: ServiceProvider) => {
        setDeleteModal({ isOpen: true, provider });
    };

    const confirmDelete = async () => {
        if (!deleteModal.provider) return;
        setIsSubmitting(true);
        try {
            // Soft delete/deactivate to preserve analytics
            await providerService.updateProvider(deleteModal.provider.id, { is_active: false });
            showToast(t('providers.success_deactivate'));
            setDeleteModal({ isOpen: false, provider: null });
            await fetchProviders();
        } catch (error: any) {
            showToast(t('providers.err_deactivate'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openAssignModal = async (provider: ServiceProvider) => {
        setSelectedProvider(provider);
        try {
            // Fetch current services from backend if we had a dedicated endpoint, 
            // but for now let's hope provider object or a join has them.
            // Since our backend getServiceProviders might not return them yet, 
            // we'll just reset or fetch if possible.
            // For now, let's assume we start fresh or the user selects.
            setAssignedServiceIds([]);
            setIsAssignModalOpen(true);
        } catch (error) {
            showToast(t('providers.err_load_assignments'), "error");
        }
    };

    const openAvailabilityModal = async (provider: ServiceProvider) => {
        setSelectedProvider(provider);
        try {
            const data = await providerService.getAvailability(provider.id);
            // Default 7 days if empty
            if (data.length === 0) {
                const defaultDays = Array.from({ length: 7 }, (_, i) => ({
                    day_of_week: i,
                    start_time: "09:00",
                    end_time: "18:00",
                    is_available: true
                }));
                setAvailabilityData(defaultDays);
            } else {
                setAvailabilityData(data);
            }
            setIsAvailabilityModalOpen(true);
        } catch (error) {
            showToast(t('providers.err_load_availability'), "error");
        }
    };

    const handleAssignServices = async () => {
        if (!selectedProvider) return;
        setIsSubmitting(true);
        try {
            await providerService.assignServices(selectedProvider.id, assignedServiceIds);
            showToast(t('providers.success_assign'));
            setIsAssignModalOpen(false);
        } catch (error: any) {
            showToast(t('providers.err_assign'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateAvailability = async () => {
        if (!selectedProvider) return;
        setIsSubmitting(true);
        try {
            await providerService.updateAvailability(selectedProvider.id, availabilityData);
            showToast(t('providers.success_availability'));
            setIsAvailabilityModalOpen(false);
        } catch (error: any) {
            showToast(t('providers.err_availability'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openLeaveModal = async (provider: ServiceProvider) => {
        setError(null);
        setSelectedProvider(provider);
        try {
            const data = await providerService.getLeaves(provider.id);
            setLeavesData(data);
            setIsLeaveModalOpen(true);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "holiday", note: "" });
        } catch (error) {
            showToast(t('providers.err_load_leaves'), "error");
        }
    };

    const handleAddLeave = async (e: React.FormEvent, shouldNotify: boolean = false) => {
        e.preventDefault();
        if (!selectedProvider) return;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const start = new Date(leaveFormData.start_date);
        const end = new Date(leaveFormData.end_date);

        if (start < tomorrow) {
            showToast(t('providers.err_past_date'), "error");
            return;
        }

        if (end < start) {
            showToast(t('providers.err_invalid_range'), "error");
            return;
        }

        // Language Guard for Note
        if (leaveFormData.note && !validateLanguage(leaveFormData.note, language)) {
            setError(t('common.err_invalid_chars'));
            return;
        }

        setError(null);

        setIsSubmitting(true);
        try {
            await providerService.addLeave(selectedProvider.id, leaveFormData);
            showToast(t('providers.success_leave_add'));
            
            if (shouldNotify) {
                const msg = t('providers.whatsapp_leave_msg', {
                    name: selectedProvider.name,
                    start: new Date(leaveFormData.start_date).toLocaleDateString(),
                    end: new Date(leaveFormData.end_date).toLocaleDateString()
                });
                const url = `https://wa.me/${selectedProvider.phone?.replace('+', '')}?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
            }

            const data = await providerService.getLeaves(selectedProvider.id);
            setLeavesData(data);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "holiday", note: "" });
            await fetchProviders(); // Refresh main list to update badges
        } catch (error: any) {
            showToast(t('providers.err_add_leave'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLeave = async (leaveId: string) => {
        if (!selectedProvider) return;
        setIsSubmitting(true);
        try {
            await providerService.deleteLeave(leaveId);
            showToast(t('providers.success_leave_delete'));
            const data = await providerService.getLeaves(selectedProvider.id);
            setLeavesData(data);
            await fetchProviders();
        } catch (error: any) {
            showToast(t('providers.err_delete_leave'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const filteredProviders = providers.filter(p =>
        p.is_active !== false && (
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.role?.toLowerCase().includes(search.toLowerCase()) ||
            p.department?.toLowerCase().includes(search.toLowerCase())
        )
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse">{t('dashboard.loading')}</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        {t('providers.title')}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-wider font-semibold">
                        {t('providers.subtitle')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-64 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('providers.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setError(null);
                            setSelectedProvider(null);
                            setFormData({ name: "", phone: "", role: "", department: "" });
                            setIsModalOpen(true);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-slate-800 active:scale-95"
                    >
                        <UserPlus className="h-4 w-4" />
                        {t('providers.add_provider')}
                    </button>
                </div>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProviders.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                        <div className="h-20 w-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 mb-6">
                            <Users className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">{t('providers.no_providers')}</h3>
                        <p className="text-sm font-semibold text-slate-400 mt-2 uppercase tracking-wider">{t('providers.no_providers_desc')}</p>
                    </div>
                ) : (
                    filteredProviders.map(provider => (
                        <div key={provider.id} className={cn(
                            "group relative bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-5",
                            !provider.is_active && "opacity-60 grayscale"
                        )}>
                            {/* Header Section */}
                            <div className="flex items-start justify-between gap-3">
                                {/* Avatar + Name + Role */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="h-14 w-14 lg:h-16 lg:w-16 shrink-0 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:scale-105 transition-transform">
                                        <div className="text-lg lg:text-xl font-black text-slate-400 uppercase">
                                            {provider.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight uppercase tracking-tight break-words line-clamp-2">{provider.name}</h3>
                                        {provider.role && (
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                                                {provider.role}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Status + Action Buttons */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border sm:whitespace-nowrap",
                                        provider.leave_status === 'on_leave' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                            provider.leave_status === 'upcoming' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    )}>
                                        {provider.leave_status === 'on_leave' ? (
                                            <span>{t('providers.on_leave')}</span>
                                        ) : provider.leave_status === 'upcoming' ? (
                                            <span>{t('providers.upcoming_leave')}</span>
                                        ) : (
                                            <span className="flex items-center gap-1.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                {t('providers.available')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEdit(provider)}
                                            className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                                            title={t('providers.edit_details')}
                                        >
                                            <Settings className="h-4 w-4" />
                                        </button>
                                        {provider.is_active && (
                                            <button
                                                onClick={() => handleDelete(provider)}
                                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title={t('providers.deactivate_expert')}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>


                            {/* Contact Info (Compact) */}
                            <div className="flex items-center gap-2 text-slate-500 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-xs font-bold tracking-tight">{provider.phone || t('providers.no_phone')}</span>
                                {provider.department && (
                                    <>
                                        <span className="text-slate-200 ml-auto">•</span>
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{provider.department}</span>
                                    </>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('providers.assigned_services')}</h4>
                                    <button
                                        onClick={() => openAssignModal(provider)}
                                        className="text-xs font-bold text-indigo-500 uppercase tracking-wider hover:text-indigo-600 transition-colors flex items-center gap-1 group/btn"
                                    >
                                        <Plus className="h-3 w-3 group-hover/btn:rotate-90 transition-transform" />
                                        {t('providers.manage')}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                                    {/* Pro Logic: Max 3 chips + X more */}
                                    {(() => {
                                        const services = (provider as any).services || (provider as any).queue_entry_services || [];
                                        if (services.length === 0) {
                                            return <span className="text-[10px] font-bold text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100/50">{t('providers.no_services_assigned')}</span>;
                                        }
                                        const displayed = services.slice(0, 3);
                                        const remaining = services.length - 3;
                                        return (
                                            <>
                                                {displayed.map((s: any) => (
                                                    <span key={s.id || s} className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100/50 rounded-lg text-xs font-semibold">
                                                        {s.name || t('providers.service_placeholder')}
                                                    </span>
                                                ))}
                                                {remaining > 0 && (
                                                    <span className="px-2 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-xs font-bold uppercase tracking-tighter">
                                                        +{remaining} {t('providers.more')}
                                                    </span>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="pt-1">
                                <button
                                    onClick={() => openLeaveModal(provider)}
                                    className="w-full py-2.5 border-2 border-amber-100 text-amber-600 bg-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-50 hover:border-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CalendarOff className="h-3.5 w-3.5" />
                                    {t('providers.manage_leave')}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-visible animate-in zoom-in-95 duration-300">
                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                        {selectedProvider ? t('providers.update_professional') : t('providers.add_new_professional')}
                                    </h3>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in slide-in-from-top-2">
                                        <AlertCircle className="h-5 w-5" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('providers.full_name')}</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder={t('providers.full_name_placeholder')}
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('providers.role')}</label>
                                            <input
                                                type="text"
                                                placeholder={t('providers.role_placeholder')}
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('providers.department')}</label>
                                            <input
                                                type="text"
                                                placeholder={t('providers.department_placeholder')}
                                                value={formData.department}
                                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('providers.phone_number')}</label>
                                        <CountryPhoneInput
                                            value={formData.phone}
                                            onChange={(full) => setFormData({ ...formData, phone: full })}
                                            placeholder={t('providers.phone_placeholder')}
                                        />
                                    </div>
                                </div>


                                <div className="pt-4">
                                    <button
                                        disabled={isSubmitting}
                                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                        {selectedProvider ? t('providers.save_changes') : t('providers.confirm_add')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Assign Services Modal */}
            {
                isAssignModalOpen && selectedProvider && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('providers.assign_services')}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedProvider.name}</p>
                                    </div>
                                    <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X className="h-6 w-6 text-slate-400" />
                                    </button>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {services.length === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                            <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300 mb-4">
                                                <Briefcase className="h-6 w-6" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-6 leading-relaxed">
                                                {t('providers.no_services_assigned')}
                                            </p>
                                        </div>
                                    ) : (
                                        services.map(service => (
                                            <div
                                                key={service.id}
                                                onClick={() => {
                                                    setAssignedServiceIds(prev =>
                                                        prev.includes(service.id)
                                                            ? prev.filter(id => id !== service.id)
                                                            : [...prev, service.id]
                                                    );
                                                }}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                                                    assignedServiceIds.includes(service.id)
                                                        ? "bg-slate-900 border-slate-900 text-white"
                                                        : "bg-slate-50 border-slate-50 text-slate-600 hover:border-slate-200"
                                                )}
                                            >
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold uppercase tracking-tight">{service.name}</p>
                                                    <p className={cn(
                                                        "text-[9px] font-medium uppercase tracking-wider",
                                                        assignedServiceIds.includes(service.id) ? "text-slate-400" : "text-slate-400"
                                                    )}>{service.duration_minutes} {t('queue.min')} • {formatCurrency(service.price, business?.currency, language)}</p>
                                                </div>
                                                {assignedServiceIds.includes(service.id) && <CheckCircle2 className="h-4 w-4 text-white" />}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button
                                    onClick={handleAssignServices}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
                                    {t('providers.update_assignments')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Availability Modal */}
            {
                isAvailabilityModalOpen && selectedProvider && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('providers.weekly_schedule')}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedProvider.name}</p>
                                    </div>
                                    <button onClick={() => setIsAvailabilityModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X className="h-6 w-6 text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {days.map((day, idx) => {
                                        const dayData = availabilityData.find(a => a.day_of_week === idx) || {
                                            day_of_week: idx,
                                            start_time: "09:00",
                                            end_time: "18:00",
                                            is_available: false
                                        };

                                        return (
                                            <div key={day} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-4 min-w-[120px]">
                                                    <input
                                                        type="checkbox"
                                                        checked={dayData.is_available}
                                                        onChange={e => {
                                                            const fresh = [...availabilityData];
                                                            const existingIdx = fresh.findIndex(a => a.day_of_week === idx);
                                                            if (existingIdx >= 0) {
                                                                fresh[existingIdx].is_available = e.target.checked;
                                                            } else {
                                                                fresh.push({ ...dayData, is_available: e.target.checked });
                                                            }
                                                            setAvailabilityData(fresh);
                                                        }}
                                                        className="h-4 w-4 rounded-lg border-2 border-slate-200 text-slate-900 focus:ring-0 transition-all cursor-pointer"
                                                    />
                                                    <span className="text-sm font-bold uppercase tracking-wider text-slate-700">{t(`providers.days.${idx}`)}</span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="time"
                                                        disabled={!dayData.is_available}
                                                        value={dayData.start_time.substring(0, 5)}
                                                        onChange={e => {
                                                            const fresh = [...availabilityData];
                                                            const existingIdx = fresh.findIndex(a => a.day_of_week === idx);
                                                            fresh[existingIdx].start_time = e.target.value;
                                                            setAvailabilityData(fresh);
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none disabled:opacity-30"
                                                    />
                                                    <span className="text-slate-300 font-bold px-1">{t('providers.to')}</span>
                                                    <input
                                                        type="time"
                                                        disabled={!dayData.is_available}
                                                        value={dayData.end_time.substring(0, 5)}
                                                        onChange={e => {
                                                            const fresh = [...availabilityData];
                                                            const existingIdx = fresh.findIndex(a => a.day_of_week === idx);
                                                            fresh[existingIdx].end_time = e.target.value;
                                                            setAvailabilityData(fresh);
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none disabled:opacity-30"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={handleUpdateAvailability}
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                                    {t('providers.save_schedule')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Leave Management Modal - Overhauled SaaS Style */}
            {
                isLeaveModalOpen && selectedProvider && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[90vh] flex flex-col">
                            <div className="grid grid-cols-1 md:grid-cols-5 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                                {/* Sidebar: History List (2/5) - hidden on mobile */}
                                <div className="hidden md:col-span-2 md:flex border-r border-slate-100 bg-slate-50/50 flex-col">
                                    <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
                                        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('providers.active_leaves')}</h3>
                                        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mt-1">{t('providers.management_console')}</p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {leavesData.length === 0 ? (
                                            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                                                <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mb-3">
                                                    <CalendarOff className="h-6 w-6" />
                                                </div>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('providers.no_history')}</p>
                                            </div>
                                        ) : (
                                            leavesData.sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()).map((leave: any) => {
                                                const today = new Date().toISOString().split('T')[0];
                                                const isCurrent = leave.start_date <= today && leave.end_date >= today;
                                                return (
                                                    <div key={leave.id} className={cn(
                                                        "p-4 rounded-2xl bg-white border shadow-sm transition-all group/item flex items-center justify-between gap-3",
                                                        isCurrent ? "border-amber-200 ring-2 ring-amber-50" : "border-slate-100 hover:border-slate-200"
                                                    )}>
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={cn(
                                                                    "w-1.5 h-1.5 rounded-full",
                                                                    leave.leave_type === 'holiday' ? "bg-emerald-500" :
                                                                        leave.leave_type === 'sick' ? "bg-rose-500" : "bg-amber-500"
                                                                )} />
                                                                <p className="text-xs font-semibold uppercase tracking-tight text-slate-400 truncate">
                                                                    {leave.leave_type} {isCurrent && `• ${t('providers.current')}`}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs font-black text-slate-900 tracking-tight">
                                                                {new Date(leave.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(leave.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-all shrink-0">
                                                            <button
                                                                onClick={() => {
                                                                    const msg = t('providers.whatsapp_leave_msg', {
                                                                        name: selectedProvider.name,
                                                                        start: new Date(leave.start_date).toLocaleDateString(),
                                                                        end: new Date(leave.end_date).toLocaleDateString()
                                                                    });
                                                                    const url = `https://wa.me/${selectedProvider.phone?.replace('+', '')}?text=${encodeURIComponent(msg)}`;
                                                                    window.open(url, '_blank');
                                                                }}
                                                                className="h-8 w-8 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                                                title={t('providers.notify_whatsapp')}
                                                            >
                                                                <MessageSquare className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteLeave(leave.id)}
                                                                className="h-8 w-8 bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center justify-center transition-all"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Main Body: Form (3/5 or full on mobile) */}
                                <div className="col-span-1 md:col-span-3 flex flex-col overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                                                {selectedProvider.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 leading-none">{selectedProvider.name}</h4>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{t('providers.plan_new_absence')}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsLeaveModalOpen(false)} className="h-10 w-10 hover:bg-slate-50 rounded-xl flex items-center justify-center transition-colors">
                                            <X className="h-5 w-5 text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="p-5 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
                                        <form onSubmit={(e) => handleAddLeave(e, false)} className="space-y-8">
                                            {error && (
                                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in slide-in-from-top-2">
                                                    <AlertCircle className="h-5 w-5" />
                                                    {error}
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('providers.start_date')}</label>
                                                    <input
                                                        required
                                                        type="date"
                                                        min={(() => {
                                                            const d = new Date();
                                                            d.setDate(d.getDate() + 1);
                                                            return d.toISOString().split('T')[0];
                                                        })()}
                                                        value={leaveFormData.start_date}
                                                        onChange={(e) => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('providers.end_date')}</label>
                                                    <input
                                                        required
                                                        type="date"
                                                        min={leaveFormData.start_date || (() => {
                                                            const d = new Date();
                                                            d.setDate(d.getDate() + 1);
                                                            return d.toISOString().split('T')[0];
                                                        })()}
                                                        value={leaveFormData.end_date}
                                                        onChange={(e) => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('providers.leave_category')}</label>
                                                <select
                                                    required
                                                    value={leaveFormData.leave_type}
                                                    onChange={(e) => setLeaveFormData({ ...leaveFormData, leave_type: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none"
                                                >
                                                    <option value="holiday">{t('providers.holiday')}</option>
                                                    <option value="sick">{t('providers.sick')}</option>
                                                    <option value="emergency">{t('providers.emergency')}</option>
                                                    <option value="other">{t('providers.other')}</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('providers.notes')}</label>
                                                <textarea
                                                    placeholder={t('providers.notes_placeholder')}
                                                    rows={2}
                                                    value={leaveFormData.note}
                                                    onChange={(e) => setLeaveFormData({ ...leaveFormData, note: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-900 outline-none transition-all resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleAddLeave(e, false)}
                                                    disabled={isSubmitting}
                                                    className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[24px] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-slate-400" />}
                                                    {t('providers.submit_leave')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleAddLeave(e, true)}
                                                    disabled={isSubmitting}
                                                    className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[24px] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-xl shadow-emerald-100"
                                                >
                                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                                                    {t('providers.approve_and_notify')}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteModal.isOpen && deleteModal.provider && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-10 text-center">
                                <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                                    <Trash2 className="h-10 w-10" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-2">{t('providers.deactivate_expert')}</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider leading-relaxed mb-8">
                                    {t('providers.deactivate_desc')} <span className="text-slate-900 border-b-2 border-slate-100">{deleteModal.provider.name}</span>?
                                    {t('providers.deactivate_warning')}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: false, provider: null })}
                                        className="py-4 bg-slate-100 text-slate-600 rounded-[20px] text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={isSubmitting}
                                        className="py-4 bg-red-500 text-white rounded-[20px] text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-200 hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('providers.deactivate')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Top-Right Toasts */}
            {
                toast && (
                    <div className="fixed top-8 right-8 z-[200] animate-in slide-in-from-right-8 duration-300">
                        <div className={cn(
                            "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 min-w-[320px] backdrop-blur-xl transition-all",
                            toast.type === 'error'
                                ? "bg-white/95 border-rose-100 text-rose-600 shadow-rose-200/20"
                                : "bg-white/95 border-emerald-100 text-emerald-600 shadow-emerald-200/20"
                        )}>
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                toast.type === 'error' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
                            )}>
                                {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                    {toast.type === 'error' ? t('common.status') : t('common.status')}
                                </p>
                                <p className="text-sm font-bold text-slate-900 truncate">{toast.message}</p>
                            </div>
                            <button onClick={() => setToast(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="h-4 w-4 text-slate-300" />
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
