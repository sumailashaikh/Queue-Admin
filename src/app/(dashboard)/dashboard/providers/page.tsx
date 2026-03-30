"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    Plus,
    Search,
    Loader2,
    X,
    UserPlus,
    Phone,
    Briefcase,
    CheckCircle2,
    CalendarOff,
    Settings,
    Clock,
    Trash2,
    AlertCircle,
    MessageSquare,
    ShieldCheck
} from "lucide-react";
import { cn, formatCurrency, validateLanguage } from "@/lib/utils";
import { CountryPhoneInput } from "@/components/CountryPhoneInput";
import { useAuth } from "@/hooks/useAuth";
import { providerService, ServiceProvider } from "@/services/providerService";
import { businessService } from "@/services/businessService";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";

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

    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isResignationModalOpen, setIsResignationModalOpen] = useState(false);
    const [leavesData, setLeavesData] = useState<any[]>([]);
    const [resignations, setResignations] = useState<any[]>([]);
    const [leaveFormData, setLeaveFormData] = useState({ start_date: "", end_date: "", leave_type: "holiday", note: "" });
    const [inviteFormData, setInviteFormData] = useState({ name: "", phone: "" });
    
    const [formData, setFormData] = useState({ 
        name: "", 
        phone: "", 
        role: "", 
        department: "",
        translations: {} as Record<string, any>
    });

    const [error, setError] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchProviders = useCallback(async () => {
        if (!business?.id) return;
        try {
            const data = await providerService.getProviders(business.id);
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

    const fetchResignations = useCallback(async () => {
        if (!business?.id) return;
        try {
            const data = await businessService.getResignationRequests(business.id);
            setResignations(data);
        } catch (error) {
            console.error("Failed to fetch resignations:", error);
        }
    }, [business?.id]);

    useEffect(() => {
        fetchProviders();
        fetchServices();
        fetchResignations();

        const interval = setInterval(() => {
            fetchProviders();
            fetchServices();
            fetchResignations();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchProviders, fetchServices, fetchResignations]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!validateLanguage(formData.name, language) || 
            (formData.role && !validateLanguage(formData.role, language)) ||
            (formData.department && !validateLanguage(formData.department, language))) {
            setError(t('common.err_invalid_chars'));
            return;
        }

        // Validation: No changes detected (for editing)
        if (selectedProvider) {
            const trans = (selectedProvider.translations as any)?.[language];
            const hasChanges =
                formData.name.trim() !== ((typeof trans === 'object' && trans.name) || selectedProvider.name).trim() ||
                formData.phone.trim() !== (selectedProvider.phone || "").trim() ||
                formData.role.trim() !== ((typeof trans === 'object' && trans.role) || selectedProvider.role || "").trim() ||
                formData.department.trim() !== ((typeof trans === 'object' && trans.department) || selectedProvider.department || "").trim();

            if (!hasChanges) {
                showToast(t('providers.no_changes_detected'), "error");
                return;
            }
        }

        const submitData = {
            ...formData,
            translations: {
                ...(formData.translations || {}),
                [language]: {
                    name: formData.name.trim(),
                    role: formData.role.trim(),
                    department: formData.department.trim()
                }
            }
        };

        setIsSubmitting(true);
        try {
            if (selectedProvider) {
                await providerService.updateProvider(selectedProvider.id, submitData);
                showToast(t('providers.success_update'));
            } else {
                await providerService.createProvider({ ...submitData, business_id: business?.id, is_active: true });
                showToast(t('providers.success_add'));
            }
            await fetchProviders();
            setIsModalOpen(false);
            setFormData({ 
                name: "", 
                phone: "", 
                role: "", 
                department: "",
                translations: {}
            });
            setSelectedProvider(null);
        } catch (error) {
            showToast(t('providers.err_save'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (provider: ServiceProvider) => {
        setError(null);
        setSelectedProvider(provider);
        const trans = (provider.translations as any)?.[language];
        setFormData({ 
            name: (typeof trans === 'object' && trans.name) || provider.name, 
            phone: provider.phone || "", 
            role: (typeof trans === 'object' && trans.role) || provider.role || "", 
            department: (typeof trans === 'object' && trans.department) || provider.department || "",
            translations: (provider.translations as any) || {}
        });
        setIsModalOpen(true);
    };

    const handleDelete = (provider: ServiceProvider) => {
        setDeleteModal({ isOpen: true, provider });
    };

    const confirmDelete = async () => {
        if (!deleteModal.provider) return;
        setIsSubmitting(true);
        try {
            await businessService.deactivateEmployee(deleteModal.provider.id);
            showToast(t('providers.success_deactivate_full'));
            setDeleteModal({ isOpen: false, provider: null });
            await fetchProviders();
        } catch (error: any) {
            const msg = error.response?.data?.message || t('providers.err_deactivate');
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openAssignModal = (provider: ServiceProvider) => {
        setSelectedProvider(provider);
        setAssignedServiceIds(provider.services?.map(s => s.id) || []);
        setIsAssignModalOpen(true);
    };

    const openAvailabilityModal = async (provider: ServiceProvider) => {
        setSelectedProvider(provider);
        try {
            const data = await providerService.getAvailability(provider.id);
            setAvailabilityData(data.length ? data : Array.from({ length: 7 }, (_, i) => ({ day_of_week: i, start_time: "09:00", end_time: "18:00", is_available: true })));
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
            await fetchProviders();
        } catch (error) {
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
        } catch (error) {
            showToast(t('providers.err_availability'), "error");
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
            setLeavesData(await providerService.getLeaves(selectedProvider.id));
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "holiday", note: "" });
            await fetchProviders();
        } catch (error) {
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
            setLeavesData(await providerService.getLeaves(selectedProvider.id));
            await fetchProviders();
        } catch (error) {
            showToast(t('providers.err_delete_leave'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateLeaveStatus = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
        if (!selectedProvider) return;
        setIsSubmitting(true);
        try {
            await providerService.updateLeaveStatus(leaveId, status, status === 'REJECTED' ? rejectionReason : undefined);
            showToast(t('common.success'));
            setRejectionReason("");
            setLeavesData(await providerService.getLeaves(selectedProvider.id));
            await fetchProviders();
        } catch (error) {
            showToast(t('common.error'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business?.id) return;
        setIsSubmitting(true);
        try {
            await businessService.inviteEmployee({ ...inviteFormData, business_id: business.id });
            showToast(t('admin.invite_modal.success', { phone: inviteFormData.phone }));
            setIsInviteModalOpen(false);
            setInviteFormData({ name: "", phone: "" });
            await fetchProviders();
        } catch (error) {
            showToast(t('admin.invite_modal.err_fail'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateResignation = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
        setIsSubmitting(true);
        try {
            await businessService.updateResignationStatus(requestId, status);
            showToast(status === 'APPROVED' ? t('providers.success_deactivate_full') : t('common.success'));
            await fetchResignations();
            await fetchProviders();
        } catch (error) {
            showToast(t('common.error'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const filteredProviders = providers.filter(p => p.is_active !== false && p.name.toLowerCase().includes(search.toLowerCase()));

    if (loading) {
        return <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.loading')}</p></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t('providers.title')}</h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-wider font-semibold">{t('providers.subtitle')}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-64 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder={t('providers.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all font-medium shadow-sm" />
                    </div>
                    {resignations.length > 0 && (
                        <button onClick={() => setIsResignationModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-bold shadow-sm hover:bg-rose-100"><AlertCircle className="h-4 w-4" />{t('providers.resignation_requests')} ({resignations.length})</button>
                    )}
                    <button onClick={() => { setInviteFormData({ name: "", phone: "" }); setIsInviteModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 border border-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all"><MessageSquare className="h-4 w-4" />{t('providers.invite_staff')}</button>
                    <button onClick={() => { setError(null); setSelectedProvider(null); setFormData({ name: "", phone: "", role: "", department: "", translations: {} }); setIsModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-all"><UserPlus className="h-4 w-4" />{t('providers.add_provider')}</button>
                </div>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProviders.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                        <div className="h-20 w-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 mb-6"><Users className="h-10 w-10" /></div>
                        <h3 className="text-xl font-bold text-slate-900">{t('providers.no_providers')}</h3>
                        <p className="text-sm font-semibold text-slate-400 mt-2 uppercase tracking-wider">{t('providers.no_providers_desc')}</p>
                    </div>
                ) : (
                    filteredProviders.map(provider => (
                        <div key={provider.id} className={cn("group bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-5", !provider.is_active && "opacity-60 grayscale")}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="h-14 w-14 lg:h-16 lg:w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 capitalize">{provider.name.charAt(0)}</div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight capitalize line-clamp-2">
                                            {provider.translations?.[language]?.name || provider.name}
                                        </h3>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                                            {provider.translations?.[language]?.role || provider.role || t('providers.role_placeholder')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", provider.leave_status === 'on_leave' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>{t(provider.leave_status === 'on_leave' ? 'providers.on_leave' : 'providers.available')}</div>
                                    <div className="flex gap-1"><button onClick={() => handleEdit(provider)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Settings className="h-4 w-4" /></button><button onClick={() => handleDelete(provider)} className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 className="h-4 w-4" /></button></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50"><Phone className="h-3.5 w-3.5" /><span className="text-xs font-bold">{provider.phone || t('providers.no_phone')}</span></div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('providers.assigned_services')}</h4><button onClick={() => openAssignModal(provider)} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1"><Plus className="h-3 w-3" />{t('providers.manage')}</button></div>
                                <div className="flex flex-wrap gap-1.5">{provider.services?.slice(0, 3).map(s => <span key={s.id} className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100/50 rounded-lg text-[10px] font-bold uppercase">{s.name}</span>)}{provider.services && provider.services.length > 3 && <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-bold">+{provider.services.length - 3} {t('providers.more')}</span>}</div>
                            </div>
                            <button onClick={() => openLeaveModal(provider)} className="w-full py-2.5 border-2 border-amber-100 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all flex items-center justify-center gap-2"><CalendarOff className="h-3.5 w-3.5" />{t('providers.manage_leave')}</button>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <form onSubmit={handleSubmit} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">{selectedProvider ? t('providers.update_professional') : t('providers.add_new_professional')}</h3><button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500"><X className="h-6 w-6" /></button></div>
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in slide-in-from-top-4">
                                <AlertCircle className="h-5 w-5" />
                                {error}
                            </div>
                        )}
                        <div className="space-y-6">
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.full_name')}</label><input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-slate-900/10" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.role')}</label><input type="text" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.department')}</label><input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none" /></div>
                            </div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.phone_number')}</label><CountryPhoneInput value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} /></div>
                        </div>
                        <button disabled={isSubmitting} className="w-full py-5 bg-slate-900 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{selectedProvider ? t('providers.save_changes') : t('providers.confirm_add')}</button>
                    </form>
                </div>
            )}

            {/* Assignment Modal */}
            {isAssignModalOpen && selectedProvider && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('providers.assign_services')}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{selectedProvider.name}</p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)}><X className="h-6 w-6 text-slate-400" /></button>
                        </div>
                        
                        <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                            {services.length === 0 ? (
                                <p className="col-span-full text-center py-10 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('providers.no_services_found')}</p>
                            ) : (
                                services.map((service) => (
                                    <label key={service.id} className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                                        assignedServiceIds.includes(service.id) ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 bg-slate-50/30 hover:border-slate-200"
                                    )}>
                                        <div className={cn(
                                            "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                                            assignedServiceIds.includes(service.id) ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                                        )}>
                                            {assignedServiceIds.includes(service.id) && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={assignedServiceIds.includes(service.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setAssignedServiceIds([...assignedServiceIds, service.id]);
                                                else setAssignedServiceIds(assignedServiceIds.filter(id => id !== service.id));
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900 truncate capitalize">{service.translations?.[language]?.name || service.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatCurrency(service.price, 'INR', language)}</p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>

                        <button 
                            disabled={isSubmitting} 
                            onClick={handleAssignServices} 
                            className="w-full py-5 bg-indigo-600 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            {t('providers.save_assignments')}
                        </button>
                    </div>
                </div>
            )}

            {/* Availability Modal */}
            {isAvailabilityModalOpen && selectedProvider && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('providers.manage_availability')}</h3>
                            <button onClick={() => setIsAvailabilityModalOpen(false)}><X className="h-6 w-6 text-slate-400" /></button>
                        </div>
                        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                            {availabilityData.map((slot, index) => (
                                <div key={slot.day_of_week} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 rounded-3xl gap-4">
                                    <div className="flex items-center gap-4 min-w-[150px]">
                                        <input 
                                            type="checkbox" 
                                            checked={slot.is_available} 
                                            onChange={e => setAvailabilityData(availabilityData.map((s, i) => i === index ? { ...s, is_available: e.target.checked } : s))}
                                            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-black text-slate-900 uppercase tracking-wider">{daysList[slot.day_of_week]}</span>
                                    </div>
                                    {slot.is_available && (
                                        <div className="flex items-center gap-3">
                                            <input type="time" value={slot.start_time} onChange={e => setAvailabilityData(availabilityData.map((s, i) => i === index ? { ...s, start_time: e.target.value } : s))} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
                                            <span className="text-slate-400 font-bold">-</span>
                                            <input type="time" value={slot.end_time} onChange={e => setAvailabilityData(availabilityData.map((s, i) => i === index ? { ...s, end_time: e.target.value } : s))} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
                                        </div>
                                    )}
                                    {!slot.is_available && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('providers.off_day')}</span>}
                                </div>
                            ))}
                        </div>
                        <button disabled={isSubmitting} onClick={handleUpdateAvailability} className="w-full py-5 bg-slate-900 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                            {t('providers.save_availability')}
                        </button>
                    </div>
                </div>
            )}

            {/* Leave Management */}
            {isLeaveModalOpen && selectedProvider && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl p-10 flex flex-col md:flex-row gap-10 animate-in zoom-in-95 duration-300">
                        <div className="flex-1 space-y-8">
                            <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('providers.manage_leave')}</h3><button onClick={() => setIsLeaveModalOpen(false)}><X className="h-6 w-6 text-slate-400" /></button></div>
                            <form onSubmit={handleAddLeave} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('providers.start_date')}</label><input required type="date" value={leaveFormData.start_date} onChange={e => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-black" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('providers.end_date')}</label><input required type="date" value={leaveFormData.end_date} onChange={e => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-black" /></div>
                                </div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('providers.notes')}</label><textarea value={leaveFormData.note} onChange={e => setLeaveFormData({ ...leaveFormData, note: e.target.value })} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-black" rows={2} /></div>
                                <button disabled={isSubmitting} className="w-full py-5 bg-amber-600 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-100">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('providers.submit_leave')}</button>
                            </form>
                        </div>
                        <div className="w-full md:w-80 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border-t md:border-t-0 md:border-l border-slate-100 md:pl-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employee.applied_leaves')}</h4>
                            {leavesData.map((leave: any) => (
                                <div key={leave.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1"><p className="text-[10px] font-black text-slate-900">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{leave.status}</p></div>
                                    <div className="flex gap-1">
                                        {leave.status === 'PENDING' && (
                                            <>
                                                <button onClick={() => handleUpdateLeaveStatus(leave.id, 'APPROVED')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                                                <button onClick={() => {
                                                    const reason = window.prompt("Reason for rejection?", "Team is fully booked");
                                                    if (reason !== null) {
                                                        setRejectionReason(reason);
                                                        handleUpdateLeaveStatus(leave.id, 'REJECTED');
                                                    }
                                                }} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Reject"><X className="h-4 w-4" /></button>
                                            </>
                                        )}
                                        <button onClick={() => handleDeleteLeave(leave.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Resignation Modal */}
            {isResignationModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('providers.resignation_requests')}</h3><button onClick={() => setIsResignationModalOpen(false)}><X className="h-6 w-6 text-slate-400" /></button></div>
                        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {resignations.length === 0 ? <p className="text-center py-10 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('providers.no_resignations')}</p> : resignations.map((req: any) => (
                                <div key={req.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between gap-4">
                                    <div className="space-y-1"><p className="text-sm font-bold text-slate-900">{req.profiles?.full_name}</p><p className="text-[10px] text-slate-500">Last Date: <span className="text-slate-900 font-bold">{new Date(req.requested_last_date).toLocaleDateString()}</span></p></div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdateResignation(req.id, 'APPROVED')} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95">{t('providers.approve_resignation')}</button>
                                        <button onClick={() => handleUpdateResignation(req.id, 'REJECTED')} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95">{t('providers.deny_resignation')}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <form onSubmit={handleInviteSubmit} className="bg-white w-full max-w-lg rounded-[40px] p-10 space-y-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-slate-900 uppercase">{t('providers.invite_staff')}</h3><button type="button" onClick={() => setIsInviteModalOpen(false)}><X className="h-6 w-6 text-slate-400" /></button></div>
                        <div className="space-y-6">
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('providers.full_name')}</label><input required type="text" value={inviteFormData.name} onChange={v => setInviteFormData({ ...inviteFormData, name: v.target.value })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-slate-900/10 outline-none" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('providers.phone_number')}</label><CountryPhoneInput value={inviteFormData.phone} onChange={v => setInviteFormData({ ...inviteFormData, phone: v })} /></div>
                        </div>
                        <button disabled={isSubmitting} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('providers.send_invite')}</button>
                    </form>
                </div>
            )}

            {/* Deactivate Check */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
                        <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto"><AlertCircle className="h-8 w-8" /></div>
                        <div><h3 className="text-lg font-bold text-slate-900">{t('providers.deactivate_expert')}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{t('providers.deactivate_confirm')}</p></div>
                        <div className="flex flex-col gap-2"><button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100">{t('providers.deactivate')}</button><button onClick={() => setDeleteModal({ isOpen: false, provider: null })} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button></div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed top-8 right-8 z-[200] animate-in slide-in-from-right-8">
                    <div className={cn("px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 min-w-[300px] backdrop-blur-xl bg-white/95", toast.type === 'error' ? "border-rose-100 text-rose-600" : "border-emerald-100 text-emerald-600")}>
                        {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                        <p className="text-xs font-bold text-slate-900">{toast.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
