"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search,
    Filter,
    Clock,
    MoreVertical,
    Loader2,
    ChevronDown,
    Plus,
    Trash2,
    Settings2,
    AlertCircle,
    X,
    Layout,
    Users,
    IndianRupee,
    Copy,
    Share2,
    RotateCcw,
    Play,
    ChevronRight,
    CheckCircle2,
    Phone,
    Monitor,
    Bell,
    Calendar,
    Wallet
} from "lucide-react";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { queueService, QueueEntry, Queue } from "@/services/queueService";
import { businessService } from "@/services/businessService";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { QueueRow } from "./components/QueueRow";
import { useLanguage } from "@/context/LanguageContext";
import { CountryPhoneInput } from "@/components/CountryPhoneInput";

// Local types have been replaced by imports from @/services/queueService

export default function LiveQueuePage() {
    const { business } = useAuth();
    const { t, language } = useLanguage();
    const [queues, setQueues] = useState<Queue[]>([]);
    const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
    const [entries, setEntries] = useState<QueueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Management State
    // Management State

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, queueId: "", queueName: "" });
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const [isServiceFilterOpen, setIsServiceFilterOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [viewMode, setViewMode] = useState<'active' | 'noshow'>('active');

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Service Filtering State
    const [services, setServices] = useState<any[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
    const [providers, setProviders] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        current_wait_time_minutes: 0,
        status: 'open' as 'open' | 'closed'
    });

    const fetchQueues = useCallback(async () => {
        try {
            let data = await queueService.getMyQueues();
            
            // AUTO-CREATE: If no queues exist, create a default one automatically
            if (data.length === 0 && business?.id) {
                console.log("No queues found, auto-creating 'Main Queue'...");
                try {
                    const newQueue = await queueService.createQueue({
                        name: 'Main Queue',
                        description: 'Primary customer queue',
                        business_id: business.id,
                        status: 'open',
                        current_wait_time_minutes: 0
                    });
                    data = [newQueue];
                } catch (createErr) {
                    console.error("Auto-creation of queue failed:", createErr);
                }
            }

            setQueues(data);

            setSelectedQueue(current => {
                if (data.length === 0) return null;

                // If we have a selection, try to find it in the new data to update it
                if (current) {
                    const updated = data.find(q => q.id === current.id);
                    if (updated) return updated;
                }

                // Default to first queue if no current selection or it was deleted
                return data[0];
            });
        } catch (error) {
            console.error("Failed to fetch queues:", error);
        } finally {
            setLoading(false);
        }
    }, [business?.id]);

    const fetchEntries = useCallback(async (queueId: string) => {
        setEntriesLoading(true);
        try {
            const data = await queueService.getQueueEntriesToday(queueId);
            setEntries(data);
        } catch (error: any) {
            console.error("Failed to fetch entries:", error);
        } finally {
            setEntriesLoading(false);
        }
    }, []);

    const fetchProviders = useCallback(async () => {
        if (!business?.id) return;
        try {
            const response = await api.get(`/service-providers?business_id=${business.id}`);
            // The API returns { status: 'success', data: [...] }
            setProviders((response as any).data || []);
        } catch (error) {
            console.error("Failed to fetch providers:", error);
        }
    }, [business?.id]);

    const handleAssignTaskProvider = async (taskId: string, providerId: string) => {
        const provider = providers.find(p => p.id === providerId);

        // Optimistic update
        setEntries((prev: QueueEntry[]) => prev.map(entry => ({
            ...entry,
            queue_entry_services: entry.queue_entry_services?.map(s =>
                s.id === taskId ? {
                    ...s,
                    assigned_provider_id: providerId,
                    service_providers: provider ? { name: provider.name } : undefined
                } : s
            )
        })));

        try {
            await queueService.assignTaskProvider(taskId, providerId);
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
            showToast(t('queue.success_assign'));
        } catch (error: any) {
            console.error("Failed to assign expert:", error);
            const raw = String(error.response?.data?.message || error.message || "").trim();
            const toastMsg = raw
                ? /\s/.test(raw)
                    ? raw
                    : t(raw as any, error.response?.data)
                : t("queue.err_assign");
            showToast(toastMsg, "error");
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
        }
    };

    const handleStartTask = async (taskId: string) => {
        // Optimistic update
        setEntries((prev: QueueEntry[]) => prev.map(entry => ({
            ...entry,
            queue_entry_services: entry.queue_entry_services?.map(s =>
                s.id === taskId ? { ...s, task_status: 'in_progress' } : s
            )
        })));

        try {
            await queueService.startTask(taskId);
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
            fetchProviders(); // Refresh provider availability
            showToast(t('queue.success_start'));
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error("Full Start Task Error:", error);
            }
            showToast(t('queue.err_start'), "error");
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        // Optimistic update
        setEntries((prev: QueueEntry[]) => prev.map(entry => ({
            ...entry,
            queue_entry_services: entry.queue_entry_services?.map(s =>
                s.id === taskId ? { ...s, task_status: 'done' } : s
            )
        })));

        try {
            await queueService.completeTask(taskId);
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
            fetchProviders(); // Refresh provider availability
            showToast(t('queue.success_complete'));
        } catch (error: any) {
            console.error("Failed to complete task:", error);
            showToast(t('queue.err_complete'), "error");
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
        }
    };

    const handleAssignProvider = async (entryId: string, providerId: string) => {
        try {
            await api.patch(`/service-providers/assignments/${entryId}`, { provider_id: providerId });
            if (selectedQueue?.id) await fetchEntries(selectedQueue.id);
            showToast(t('queue.success_assign'));
        } catch (error: any) {
            showToast(t('queue.err_assign'), "error");
        }
    };

    const handleInitializeTasks = async (entryId: string, providerId?: string) => {
        try {
            await queueService.initializeEntryTasks(entryId, providerId);
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
            showToast(t('queue.success_initialized'));
        } catch (error: any) {
            console.error("Failed to initialize tasks:", error);
            showToast(t('queue.err_initialize'), "error");
        }
    };

    const handleNextCustomer = async () => {
        if (!selectedQueue) return;
        setIsSubmitting(true);
        try {
            await queueService.nextEntry(selectedQueue.id);
            await fetchEntries(selectedQueue.id);
            showToast(t('queue.success_next'));
        } catch (error: any) {
            const raw = String(error?.response?.data?.message || error?.message || "").trim();
            const lower = raw.toLowerCase();
            const msg = lower.includes("please assign")
                ? t('queue.err_next_assign_expert')
                : (lower.includes("no available expert") || lower.includes("currently serving another customer"))
                    ? t('queue.err_next_expert_busy')
                    : (raw || t('queue.err_next'));
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchServices = useCallback(async () => {
        try {
            const sData = await api.get<any[]>(`/businesses/${business?.id}/services`);
            const sList = (sData as any).data || [];
            setServices(sList);
        } catch (error) {
            try {
                const myServices = await api.get<any[]>('/services/my');
                setServices((myServices as any).data || []);
            } catch (err) {
                console.error("Failed to fetch services:", err);
            }
        }
    }, [business?.id]);

    useEffect(() => {
        console.log("Mounting LiveQueuePage - fetching initial data");
        fetchQueues();
        fetchServices();
        fetchProviders();
    }, [fetchQueues, fetchServices, fetchProviders]);

    useEffect(() => {
        if (selectedQueue?.id) {
            fetchEntries(selectedQueue.id);
        }
    }, [selectedQueue?.id, fetchEntries]); // Re-fetch only when ID actually changes

    // Realtime Sync
    useEffect(() => {
        if (!selectedQueue?.id) return;

        const channel = supabase
            .channel(`queue-entries-${selectedQueue.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'queue_entries',
                    filter: `queue_id=eq.${selectedQueue.id}`
                },
                () => {
                    fetchEntries(selectedQueue.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedQueue?.id, fetchEntries]);

    const handleUpdateStatus = async (id: string, status: QueueEntry['status']) => {
        try {
            await queueService.updateEntryStatus(id, status);
            // Optimistic update
            setEntries((prev: QueueEntry[]) => prev.map((item: QueueEntry) =>
                item.id === id ? { ...item, status } : item
            ));

            if (status === 'serving') showToast(t('queue.success_start'));
            else if (status === 'completed') showToast(t('queue.success_complete'));
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
        } catch (error: any) {
            console.error("Failed to update status:", error);
            showToast(t('queue.err_status'), "error");
        }
    };

    const handleUpdatePayment = async (id: string, method: 'cash' | 'qr' | 'card' | 'unpaid') => {
        try {
            await queueService.updatePayment(id, method);
            setEntries((prev: QueueEntry[]) => prev.map((item: QueueEntry) =>
                item.id === id ? { ...item, payment_method: method } : item
            ));
            showToast(t('queue.success_payment', { method: method.toUpperCase() }));
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
        } catch (error: any) {
            console.error("Failed to update payment:", error);
            showToast(t('queue.err_payment'), "error");
        }
    };

    const handleNoShow = async (id: string) => {
        try {
            await queueService.noShowEntry(id);
            // Update status to no_show instead of removing
            setEntries((prev: QueueEntry[]) => prev.map((item: QueueEntry) =>
                item.id === id ? { ...item, status: 'no_show' } : item
            ));
            showToast(t('queue.success_noshow'));
        } catch (error: any) {
            console.error("Failed to mark no-show:", error);
            showToast(t('queue.err_noshow'), "error");
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await queueService.restoreEntry(id);
            showToast(t('queue.success_restore'));
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
            
            // "Redirect" to Live Queue tab automatically upon restoration
            setViewMode('active');
        } catch (error: any) {
            console.error("Failed to restore customer:", error);
            showToast(t('queue.err_restore'), "error");
        }
    };

    const handleSkip = async (id: string) => {
        try {
            await queueService.skipEntry(id);
            if (selectedQueue) fetchEntries(selectedQueue.id);
            showToast(t('queue.success_skip'));
        } catch (error: any) {
            console.error("Failed to skip:", error);
            const msg = error.message?.startsWith('queue.') ? t(error.message) : t('queue.err_skip');
            showToast(msg, "error");
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            // Force re-render to update "Xm ago" timers
            setEntries(prev => [...prev]);
            // Refresh data from API
            if (selectedQueue?.id) fetchEntries(selectedQueue.id);
            fetchQueues();
        }, 30000);
        return () => clearInterval(interval);
    }, [selectedQueue?.id, fetchEntries, fetchQueues]);

    const handleCopyLink = () => {
        if (!business) return;
        const link = `${window.location.origin}/p/${business.slug}`;
        navigator.clipboard.writeText(link);
        showToast(t('queue.link_copied'));
    };


    const handleUpdateQueue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQueue) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await queueService.updateQueue(selectedQueue.id, formData);
            await fetchQueues();
            setIsEditModalOpen(false);
            showToast(t('queue.success_update'));
        } catch (err: any) {
            showToast(err.message || t('queue.err_update'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal.queueId) return;
        setIsDeleting(true);
        try {
            await queueService.deleteQueue(deleteModal.queueId);
            setDeleteModal({ isOpen: false, queueId: "", queueName: "" });
            await fetchQueues();
            showToast(t('queue.success_delete'));
        } catch (err: any) {
            console.error("Delete failed:", err);
            showToast(err.message || t('queue.err_delete'), "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleResetQueue = async () => {
        if (!selectedQueue) return;
        setIsDeleting(true);
        try {
            await queueService.resetQueueEntries(selectedQueue.id);
            await fetchEntries(selectedQueue.id);
            setIsResetModalOpen(false);
            showToast(t('queue.success_reset'));
        } catch (err: any) {
            console.error("Reset failed:", err);
            showToast(err.message || t('queue.err_reset'), "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditModal = () => {
        if (!selectedQueue) return;
        setFormData({
            name: selectedQueue.name,
            description: selectedQueue.description || "",
            current_wait_time_minutes: selectedQueue.current_wait_time_minutes,
            status: selectedQueue.status as 'open' | 'closed'
        });
        setIsEditModalOpen(true);
    };

    const filteredEntries = entries.filter(item => {
        const matchesSearch = (item.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
            (item.phone && item.phone.includes(search));

        const matchesService = selectedServiceId === "all" ||
            item.queue_entry_services?.some(s => s.services?.id === selectedServiceId) ||
            (item.service_name && item.service_name.includes(services.find(s => s.id === selectedServiceId)?.name));

        // Robust normalization of status to avoid string mismatch bugs
        const s = (item.status || "").toLowerCase().trim();

        // Active Queue: strictly show only those waiting/being served
        // Completed entries that are UNPAID are also included so payment can be selected
        const isUnpaidCompleted = s === 'completed' && (item.payment_method === 'unpaid' || !item.payment_method);
        
        const matchesViewMode = viewMode === 'active'
            ? (['waiting', 'serving', 'skipped'].includes(s) || isUnpaidCompleted)
            : (s === 'no_show');

        // Extra safety: If there's no service filter, don't check for service matching
        const finalMatches = matchesSearch && matchesViewMode && (selectedServiceId === 'all' ? true : matchesService);

        return finalMatches;
    });

    const getWaitTimeDisplay = (timeString: string) => {
        if (!timeString) return "--";
        try {
            const joined = new Date(timeString).getTime();
            const now = new Date().getTime();
            const diffInMinutes = Math.floor((now - joined) / (1000 * 60));

            if (diffInMinutes < 1) return t('queue.just_now');
            if (diffInMinutes < 60) return t('queue.m_ago', { m: diffInMinutes });
            const hours = Math.floor(diffInMinutes / 60);
            const mins = diffInMinutes % 60;
            return t('queue.h_m_ago', { h: hours, m: mins });
        } catch (e) {
            return "--";
        }
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return "--:--";
        try {
            return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "--:--";
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse">{t('queue.refreshing_live_queue')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        {t('queue.title')}
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Static Queue Identity */}
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <Layout className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold text-slate-900">{selectedQueue?.name || t('queue.active_queue')}</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>

                        {business && (
                            <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <button
                                    onClick={handleCopyLink}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all",
                                        isCopied
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    {isCopied ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                                    <span className="hidden sm:inline">{isCopied ? t('queue.link_copied') : t('queue.join_link')}</span>
                                </button>
                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                <button
                                    onClick={() => {
                                        if (business) {
                                            const link = `/display/${business.slug}`;
                                            window.location.href = link;
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold tracking-wide transition-all hover:bg-slate-800 shadow-sm"
                                >
                                    <Monitor className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('queue.tv_mode')}</span>
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            {selectedQueue && (
                                <button
                                    onClick={handleNextCustomer}
                                    disabled={isSubmitting || entries.length === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-semibold tracking-wide transition-all hover:bg-primary/90 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                    {t('queue.next_customer')}
                                </button>
                            )}
                            {business && (
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 rounded-2xl text-sm font-semibold tracking-wide transition-all hover:scale-105 active:scale-95"
                                >
                                    <Phone className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('queue.whatsapp_invite')}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {selectedQueue && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={openEditModal}
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                title={t('queue.queue_settings')}
                            >
                                <Settings2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setDeleteModal({ isOpen: true, queueId: selectedQueue.id, queueName: selectedQueue.name })}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title={t('queue.delete_queue')}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setIsResetModalOpen(true)}
                                className="px-3 py-2 text-primary hover:bg-primary/5 rounded-xl transition-all text-xs font-semibold tracking-wide border border-primary/10"
                                title={t('queue.reset_today')}
                            >
                                {t('queue.reset_today')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative group w-full md:w-72">
                    <Search className="absolute left-6 top-1/2 -translate-y-[48%] h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder={t('queue.search_customers')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 pr-6 py-3.5 bg-white border-2 border-slate-100 rounded-3xl text-sm font-semibold text-slate-900 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all w-full shadow-sm placeholder:text-slate-400 placeholder:font-medium"
                    />
                </div>

                <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
                    <button
                        onClick={() => setViewMode('active')}
                        className={cn(
                            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                            viewMode === 'active'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {t('queue.active_queue')} <span dir="ltr">({entries.filter(e => {
                            const s = (e.status || "").toLowerCase().trim();
                            return s === 'waiting' || s === 'serving' || s === 'skipped';
                        }).length})</span>
                    </button>
                    <button
                        onClick={() => setViewMode('noshow')}
                        className={cn(
                            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                            viewMode === 'noshow'
                                ? "bg-white text-rose-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {t('queue.no_shows')} <span dir="ltr">({entries.filter(e => (e.status || "").toLowerCase().trim() === 'no_show').length})</span>
                    </button>
                </div>

            </div>

            {/* Queue Summary Bar */}
            {selectedQueue && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-[24px] border-2 border-slate-50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-50/50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight mb-0.5">{t('queue.active_guests')}</p>
                            <p className="text-2xl font-black text-slate-900 leading-tight tabular-nums">{entries.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border-2 border-slate-50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-amber-50/50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100/50">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight mb-0.5">{t('queue.estimated_wait')}</p>
                            <p className="text-2xl font-black text-slate-900 leading-tight tabular-nums">
                                {formatDuration(entries
                                    .filter(e => e.status === 'waiting')
                                    .reduce((acc, e) => {
                                        const serviceDuration = e.queue_entry_services?.reduce((sAcc, s) => sAcc + (s.duration_minutes || 0), 0) || (selectedQueue?.current_wait_time_minutes || 0);
                                        return acc + serviceDuration;
                                    }, 0), t)}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border-2 border-slate-50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-emerald-50/50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight mb-0.5">{t('queue.payment_received')}</p>
                            <p className="text-2xl font-black text-slate-900 leading-tight tabular-nums">
                                {formatCurrency(
                                    entries.reduce((acc, e) => {
                                        const entryPrice = e.queue_entry_services?.reduce((sAcc, s) => sAcc + (s.price || 0), 0) || (selectedQueue?.services?.price || 0);
                                        return acc + entryPrice;
                                    }, 0),
                                    business?.currency || 'USD',
                                    language
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border-2 border-slate-50 shadow-sm flex items-center gap-4">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center",
                            selectedQueue.status === 'open' ? "bg-indigo-50 text-indigo-600" : "bg-red-50 text-red-600"
                        )}>
                            <div className={cn("h-3 w-3 rounded-full", selectedQueue.status === 'open' ? "bg-indigo-600" : "bg-red-600")} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('queue.status')}</p>
                            <p className="text-2xl font-bold text-slate-900 uppercase">
                                {selectedQueue.status === 'open' ? t('queue.active_open') : selectedQueue.status === 'closed' ? t('queue.closed') : t('queue.paused')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard List Container */}
            <div className="space-y-4">
                {entriesLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4 bg-white rounded-[32px] border-2 border-slate-50">
                        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('queue.refreshing_live_queue')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {filteredEntries.length === 0 ? (
                            <div className="py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 col-span-full">
                                <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
                                    <div className="h-24 w-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-300">
                                        <Users className="h-12 w-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-black text-slate-900">{t('queue.queue_is_clear')}</p>
                                        <p className="text-sm font-bold text-slate-400 leading-relaxed">
                                            {selectedQueue
                                                ? t('queue.no_customers')
                                                : t('queue.select_queue_hint')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {filteredEntries.map((item) => (
                                    <QueueRow
                                        key={item.id}
                                        item={item}
                                        business={business}
                                        providers={providers}
                                        onAssignTaskProvider={handleAssignTaskProvider}
                                        onStartTask={handleStartTask}
                                        onCompleteTask={handleCompleteTask}
                                        onUpdateStatus={handleUpdateStatus}
                                        onUpdatePayment={handleUpdatePayment}
                                        onNoShow={handleNoShow}
                                        onRestore={handleRestore}
                                        onSkip={handleSkip}
                                        onInitializeTasks={() => handleInitializeTasks(item.id)}
                                        onShowToast={showToast}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                )}

            </div>

            {/* Dashboard Toast Notifications */}
            {
                toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-3 sm:px-0 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className={cn(
                            "max-w-[calc(100vw-1.5rem)] sm:max-w-md px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl shadow-2xl flex items-start gap-3 border-2 backdrop-blur-md transition-all",
                            toast.type === 'success'
                                ? "bg-emerald-500 text-white border-emerald-400/50"
                                : "bg-red-500 text-white border-red-400/50"
                        )}>
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                            ) : (
                                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                            )}
                            <p className="text-sm sm:text-[15px] font-semibold leading-snug whitespace-normal break-words">
                                {toast.message}
                            </p>
                        </div>
                    </div>
                )
            }

            {/* Modals & Dialogs */}
            <ManagementModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleUpdateQueue}
                formData={formData}
                setFormData={setFormData}
                isSubmitting={isSubmitting}
                error={error}
                mode="edit"
            />

            <DeleteDialog
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, queueId: "", queueName: "" })}
                onConfirm={confirmDelete}
                queueName={deleteModal.queueName}
                isDeleting={isDeleting}
            />

            <ResetDialog
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetQueue}
                isDeleting={isDeleting}
            />

            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                business={business}
            />

        </div >
    );
}

const InviteModal = ({ isOpen, onClose, business }: any) => {
    const { t } = useLanguage();
    const [inviteData, setInviteData] = useState({ name: '', phone: '' });
    if (!isOpen) return null;

    const handleSendInvite = (e: React.FormEvent) => {
        e.preventDefault();
        const link = `${window.location.host}/${business.slug}`;
        const message = `Hello ${inviteData.name},\n\nThis is ${business.name}. You can join the queue online using this link: ${link}\n\nAfter joining, you'll see your token number and live waiting time.\n\nThank you.`;
        // CountryPhoneInput already provides the full number with +
        let phone = inviteData.phone.replace(/\+/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('queue.whatsapp_invite')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSendInvite} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('queue.customer_name')}</label>
                        <input
                            required
                            type="text"
                            placeholder={t('queue.customer_name_placeholder')}
                            value={inviteData.name}
                            onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-primary/20"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('queue.whatsapp_number')}</label>
                        <CountryPhoneInput
                            value={inviteData.phone}
                            onChange={(full) => setInviteData({ ...inviteData, phone: full })}
                            placeholder={t('queue.whatsapp_number_placeholder')}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-xl shadow-emerald-500/10 transition-all active:scale-95"
                    >
                        {t('queue.generating_invite')}
                    </button>
                </form>
            </div>
        </div>
    );
};

const ManagementModal = ({ isOpen, onClose, onSubmit, formData, setFormData, isSubmitting, error, mode }: any) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50">
                <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                {mode === 'create' ? t('queue.create_queue') : t('queue.update_queue_config')}
                            </h2>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {mode === 'create' ? t('queue.define_new_flow') : t('queue.update_queue_config')}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-red-600 animate-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('queue.queue_identity')}</label>
                            <input
                                required
                                type="text"
                                placeholder={t('queue.queue_identity_placeholder')}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('queue.description_optional')}</label>
                            <textarea
                                rows={2}
                                placeholder={t('queue.description_placeholder')}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('queue.avg_time_person')}</label>
                                <input
                                    type="number"
                                    value={formData.current_wait_time_minutes || ""}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setFormData({ ...formData, current_wait_time_minutes: v === "" ? 0 : parseInt(v) });
                                    }}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('queue.daily_status')}</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all appearance-none"
                                >
                                    <option value="open">{t('queue.active_open')}</option>
                                    <option value="closed">{t('queue.closed')}</option>
                                    <option value="paused">{t('queue.paused')}</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-5 bg-primary hover:bg-primary-hover text-white rounded-[20px] text-sm font-bold uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                mode === 'create' ? t('queue.initialize_queue') : t('queue.save_configuration')
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const DeleteDialog = ({ isOpen, onClose, onConfirm, queueName, isDeleting }: any) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50">
                <div className="p-10 text-center space-y-8">
                    <div className="h-24 w-24 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto text-red-600 transition-transform hover:scale-110 duration-500">
                        <Trash2 className="h-12 w-12" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-slate-900">{t('queue.delete_queue_confirm')}</h3>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed px-2">
                            {t('queue.delete_queue_desc_1')} <span className="text-slate-900">{queueName}</span>{t('queue.delete_queue_desc_2')}
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            disabled={isDeleting}
                            onClick={onConfirm}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-500/10 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('queue.confirm_delete')}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 border-2 border-slate-100 hover:border-slate-300 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            {t('queue.cancel')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
const ResetDialog = ({ isOpen, onClose, onConfirm, isDeleting }: any) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50">
                <div className="p-8 text-center space-y-6">
                    <div className="h-20 w-20 bg-amber-50 rounded-[32px] flex items-center justify-center text-amber-500 mx-auto">
                        <AlertCircle className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('queue.clear_todays_queue')}</h2>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed px-4">
                            {t('queue.clear_todays_queue_desc')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 h-14 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            {t('queue.keep_entries')}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 h-14 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('queue.yes_clear')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
