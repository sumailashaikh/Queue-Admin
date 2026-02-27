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
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { providerService, ServiceProvider } from "@/services/providerService";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export default function ProvidersPage() {
    const { business } = useAuth();
    const { t } = useLanguage();
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
    }, [fetchProviders, fetchServices]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (selectedProvider) {
                // Change Detection
                const hasChanges =
                    formData.name !== selectedProvider.name ||
                    formData.phone !== (selectedProvider.phone || "") ||
                    formData.role !== (selectedProvider.role || "") ||
                    formData.department !== (selectedProvider.department || "");

                if (!hasChanges) {
                    showToast(t('providers.no_changes'), "success");
                    setIsModalOpen(false);
                    return;
                }

                await providerService.updateProvider(selectedProvider.id, formData);
                showToast(t('providers.success_update'));
            } else {
                await providerService.createProvider({ ...formData, business_id: business?.id });
                showToast(t('providers.success_add'));
            }
            await fetchProviders();
            setIsModalOpen(false);
            setFormData({ name: "", phone: "", role: "", department: "" });
            setSelectedProvider(null);
        } catch (error: any) {
            showToast(error.message || "Failed to save provider", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (provider: ServiceProvider) => {
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
            await providerService.deleteProvider(deleteModal.provider.id);
            showToast(t('providers.success_deactivate'));
            await fetchProviders();
            setDeleteModal({ isOpen: false, provider: null });
        } catch (error: any) {
            showToast(error.message || t('providers.err_deactivate'), "error");
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
            showToast(error.message || t('providers.err_assign'), "error");
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
            showToast(error.message || t('providers.err_availability'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openLeaveModal = async (provider: ServiceProvider) => {
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

    const handleAddLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProvider) return;
        setIsSubmitting(true);
        try {
            await providerService.addLeave(selectedProvider.id, leaveFormData);
            showToast(t('providers.success_leave_add'));
            const data = await providerService.getLeaves(selectedProvider.id);
            setLeavesData(data);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "holiday", note: "" });
            await fetchProviders(); // Refresh main list to update badges
        } catch (error: any) {
            showToast(error.message || t('providers.err_add_leave'), "error");
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
            showToast(error.message || t('providers.err_delete_leave'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const filteredProviders = providers.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.role?.toLowerCase().includes(search.toLowerCase())
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
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-14 w-14 shrink-0 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:scale-105 transition-transform">
                                        <div className="text-lg font-black text-slate-400 uppercase">
                                            {provider.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-slate-900 truncate leading-tight uppercase tracking-tight">{provider.name}</h3>
                                            <button
                                                onClick={() => handleEdit(provider)}
                                                className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all shrink-0"
                                                title={t('providers.edit_details')}
                                            >
                                                <Settings className="h-4 w-4" />
                                            </button>
                                        </div>
                                        {provider.role && (
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {provider.role}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 whitespace-nowrap",
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
                            </div>

                            {/* Contact Info (Compact) */}
                            <div className="flex items-center gap-2 text-slate-500 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-xs font-bold tracking-tight">{provider.phone || t('providers.no_phone')}</span>
                                {provider.department && (
                                    <>
                                        <span className="text-slate-200 ml-auto">•</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{provider.department}</span>
                                    </>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('providers.assigned_services')}</h4>
                                    <button
                                        onClick={() => openAssignModal(provider)}
                                        className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider hover:text-indigo-600 transition-colors flex items-center gap-1 group/btn"
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
                                            return <span className="text-[10px] font-bold text-slate-400 italic">{t('providers.no_services_assigned')}</span>;
                                        }
                                        const displayed = services.slice(0, 3);
                                        const remaining = services.length - 3;
                                        return (
                                            <>
                                                {displayed.map((s: any) => (
                                                    <span key={s.id || s} className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100/50 rounded-lg text-[10px] font-bold">
                                                        {s.name || t('providers.service_placeholder')}
                                                    </span>
                                                ))}
                                                {remaining > 0 && (
                                                    <span className="px-2 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-[10px] font-black uppercase tracking-tighter">
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
                                    className="w-full py-2.5 border-2 border-amber-100 text-amber-600 bg-white rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-amber-50 hover:border-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2"
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
                        <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                        {selectedProvider ? t('providers.update_professional') : t('providers.add_new_professional')}
                                    </h3>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X className="h-6 w-6 text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 ml-1">{t('providers.full_name')}</label>
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
                                            <label className="text-xs font-bold text-slate-700 ml-1">{t('providers.role')}</label>
                                            <input
                                                type="text"
                                                placeholder={t('providers.role_placeholder')}
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 ml-1">{t('providers.department')}</label>
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
                                        <label className="text-xs font-bold text-slate-700 ml-1">{t('providers.phone_number')}</label>
                                        <input
                                            type="tel"
                                            placeholder={t('providers.phone_placeholder')}
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
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
                                    {services.map(service => (
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
                                                )}>{service.duration_minutes} min • ₹{service.price}</p>
                                            </div>
                                            {assignedServiceIds.includes(service.id) && <CheckCircle2 className="h-4 w-4 text-white" />}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleAssignServices}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
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
                                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
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
                        <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-5 h-[650px]">
                                {/* Sidebar: History List (2/5) */}
                                <div className="md:col-span-2 border-r border-slate-100 bg-slate-50/50 flex flex-col">
                                    <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('providers.active_leaves')}</h3>
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">{t('providers.management_console')}</p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {leavesData.length === 0 ? (
                                            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                                                <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mb-3">
                                                    <CalendarOff className="h-6 w-6" />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('providers.no_history')}</p>
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
                                                                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400 truncate">
                                                                    {leave.leave_type} {isCurrent && `• ${t('providers.current')}`}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs font-black text-slate-900 tracking-tight">
                                                                {new Date(leave.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(leave.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteLeave(leave.id)}
                                                            className="h-8 w-8 bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover/item:opacity-100 shrink-0"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Main Body: Form (3/5) */}
                                <div className="md:col-span-3 flex flex-col">
                                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                                                {selectedProvider.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 leading-none">{selectedProvider.name}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('providers.plan_new_absence')}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsLeaveModalOpen(false)} className="h-10 w-10 hover:bg-slate-50 rounded-xl flex items-center justify-center transition-colors">
                                            <X className="h-5 w-5 text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
                                        <form onSubmit={handleAddLeave} className="space-y-8">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.start_date')}</label>
                                                    <input
                                                        required
                                                        type="date"
                                                        value={leaveFormData.start_date}
                                                        onChange={(e) => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.end_date')}</label>
                                                    <input
                                                        required
                                                        type="date"
                                                        value={leaveFormData.end_date}
                                                        onChange={(e) => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.leave_category')}</label>
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.notes')}</label>
                                                <textarea
                                                    placeholder={t('providers.notes_placeholder')}
                                                    rows={2}
                                                    value={leaveFormData.note}
                                                    onChange={(e) => setLeaveFormData({ ...leaveFormData, note: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-900 outline-none transition-all resize-none"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
                                            >
                                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                {t('providers.submit_leave')}
                                            </button>
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
                                        className="py-4 bg-slate-50 text-slate-600 rounded-[20px] text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-all"
                                    >
                                        {t('providers.cancel')}
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
                                    {toast.type === 'error' ? 'Expertise System Alert' : 'System Update'}
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
