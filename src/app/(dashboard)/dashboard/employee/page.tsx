"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
    Briefcase, 
    CalendarClock, 
    CheckCircle2, 
    Clock, 
    LayoutDashboard, 
    Loader2, 
    LogOut, 
    Play, 
    User,
    CalendarOff,
    AlertCircle,
    ChevronRight,
    Star,
    X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency, validateLanguage, formatLeaveDateRange } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { providerService, ServiceProvider } from "@/services/providerService";
import { queueService, QueueEntry } from "@/services/queueService";
import { appointmentService } from "@/services/appointmentService";

function pickQueueEntryServiceId(entry: QueueEntry, action: "start" | "complete"): string | null {
    const rows = entry.queue_entry_services;
    if (!rows?.length) return null;
    if (action === "complete") {
        const active = rows.find((s) => s.task_status === "in_progress");
        return active?.id ?? null;
    }
    const pending = rows.find((s) => s.task_status === "pending");
    return pending?.id ?? null;
}
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { businessService } from "@/services/businessService";
import LanguageSwitcher from "@/components/LanguageSwitcher";

import { useSearchParams } from "next/navigation";

import { Suspense } from "react";

function EmployeeDashboardContent() {
    const { user, business, logout } = useAuth();
    const { t, language } = useLanguage();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    
    const [profile, setProfile] = useState<ServiceProvider | null>(null);
    const [tasks, setTasks] = useState<QueueEntry[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
    const [myDayOffs, setMyDayOffs] = useState<any[]>([]);
    const [myBlockTimes, setMyBlockTimes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'work' | 'leave'>(tabParam === 'leave' ? 'leave' : 'work');
    const [leaveImpact, setLeaveImpact] = useState<any | null>(null);
    const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);

    // Update activeTab if URL parameter changes
    useEffect(() => {
        if (tabParam === 'leave') {
            setActiveTab('leave');
        } else {
            setActiveTab('work');
        }
    }, [tabParam]);
    
    // Leave Form State
    const [leaveFormData, setLeaveFormData] = useState({
        start_date: "",
        end_date: "",
        leave_type: "normal",
        leave_kind: "FULL_DAY",
        start_time: "",
        end_time: "",
        note: ""
    });
    
    // Resignation State
    const [isResignationModalOpen, setIsResignationModalOpen] = useState(false);
    const [resignationFormData, setResignationFormData] = useState({
        requested_last_date: "",
        reason: ""
    });
    
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const minLeaveDate = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const showLeaveSubmitResult = (resp: any) => {
        if (resp?.owner_phone_configured === false) {
            showToast(t('employee.leave_owner_no_phone_hint'), "error");
            return;
        }
        if (resp?.notification_sent === false) {
            showToast(t('employee.leave_notify_owner_failed'), "error");
            return;
        }
        showToast(t('employee.leave_success'));
    };

    const parseApiMessage = (error: any, fallbackKey: string) => {
        const raw = String(error?.response?.data?.message || error?.message || "").trim();
        if (!raw) return t(fallbackKey as any);
        if (raw.includes(".")) {
            const localized = t(raw as any, error?.response?.data);
            return localized !== raw ? localized : t(fallbackKey as any);
        }
        return t(fallbackKey as any);
    };

    const leaveTypeLabel = (leaveType?: string) => {
        const v = String(leaveType || "").toLowerCase();
        if (v === "normal") return "Normal";
        if (v === "planned") return "Planned";
        if (v === "holiday") return t("providers.holiday");
        if (v === "sick") return t("providers.sick");
        if (v === "emergency") return t("providers.emergency");
        if (v === "other") return t("providers.other");
        return leaveType || t("providers.other");
    };
    const leaveKindLabel = (leaveKind?: string) => {
        const v = String(leaveKind || "FULL_DAY").toUpperCase();
        if (v === "HALF_DAY") return t("providers.half_day");
        if (v === "EMERGENCY") return t("providers.emergency_time");
        return t("providers.full_day");
    };

    const getLocalizedLabel = (value: any, fallbackKey: string) => {
        if (!value) return t(fallbackKey as any);
        if (typeof value === "string") return value;
        if (typeof value === "object") {
            const langValue = value?.[language];
            if (typeof langValue === "string" && langValue.trim()) return langValue;
            const firstString = Object.values(value).find((v) => typeof v === "string" && String(v).trim());
            if (firstString) return String(firstString);
        }
        return t(fallbackKey as any);
    };

    const localizedStatus = (rawStatus: any) => {
        const normalized = String(rawStatus || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");
        const key = `status.${normalized}` as any;
        const translated = t(key);
        if (translated && translated !== key) return translated;
        if (normalized === "in_service") {
            const serving = t("status.serving" as any);
            if (serving && serving !== "status.serving") return serving;
            return "In Service";
        }
        return normalized.replace(/_/g, " ");
    };
    const queueTaskServiceLabel = (task: QueueEntry) => {
        const serviceNames = (task.queue_entry_services || [])
            .map((s: any) => getLocalizedLabel(s?.services?.name, 'services.title'))
            .filter((name: string) => !!name && name !== t('services.title'));
        if (serviceNames.length > 0) return serviceNames.join(", ");
        return getLocalizedLabel(task.service_name, 'services.title');
    };
    const appointmentCustomerLabel = (a: any) =>
        a?.customer?.full_name ||
        a?.customer?.name ||
        a?.guest_name ||
        a?.customer_name ||
        t('admin.customer');

    const fetchData = useCallback(async () => {
        try {
            const [profileData, tasksData, apptsData] = await Promise.all([
                providerService.getMyProfile(),
                queueService.getMyTasks(),
                appointmentService.getMyAssignedAppointments()
            ]);
            const [leavesData, availabilityData, dayOffData, blockData] = profileData?.id
                ? await Promise.all([
                    providerService.getLeaves(profileData.id),
                    providerService.getAvailability(profileData.id),
                    providerService.getDayOffs(profileData.id),
                    providerService.getBlockTimes(profileData.id)
                ])
                : [[], [], [], []];
            setProfile(profileData);
            setTasks(tasksData);
            setAppointments(apptsData || []);
            // Keep rejected items visible so employee can read manager feedback/rejection reason.
            setLeaves(leavesData || []);
            setWeeklySchedule(availabilityData || []);
            setMyDayOffs(dayOffData || []);
            setMyBlockTimes(blockData || []);
        } catch (error) {
            console.error("Failed to fetch employee data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleStartTask = async (entry: QueueEntry) => {
        const serviceTaskId = pickQueueEntryServiceId(entry, "start");
        if (!serviceTaskId) {
            showToast(t("employee.err_no_service_task"), "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await queueService.startTask(serviceTaskId);
            showToast(t('queue.success_start'));
            fetchData();
        } catch (error) {
            showToast(t('queue.err_start'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompleteTask = async (entry: QueueEntry) => {
        const serviceTaskId = pickQueueEntryServiceId(entry, "complete");
        if (!serviceTaskId) {
            showToast(t("employee.err_no_service_task"), "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await queueService.completeTask(serviceTaskId);
            showToast(t('queue.success_complete'));
            fetchData();
        } catch (error: any) {
            showToast(parseApiMessage(error, 'queue.err_complete'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveFormData.start_date || !leaveFormData.end_date || !leaveFormData.note) {
            showToast(t('providers.all_fields_required'), "error");
            return;
        }
        const kind = String((leaveFormData as any).leave_kind || 'FULL_DAY').toUpperCase();
        if ((kind === 'HALF_DAY' || kind === 'EMERGENCY') && (!leaveFormData.start_time || !leaveFormData.end_time)) {
            showToast(t('providers.err_leave_time_required'), "error");
            return;
        }
        if (!validateLanguage(leaveFormData.note, language)) {
            showToast(t('common.err_invalid_chars'), "error");
            return;
        }
        if (leaveFormData.start_date < minLeaveDate || leaveFormData.end_date < minLeaveDate) {
            showToast(t('providers.err_leave_past_dates'), "error");
            return;
        }
        if (leaveFormData.end_date < leaveFormData.start_date) {
            showToast(t('providers.all_fields_required'), "error");
            return;
        }

        setIsSubmitting(true);
        try {
            if (!profile?.id) {
                showToast(t('providers.err_add_leave'), "error");
                return;
            }

            // Smart leave validation: warn/block based on appointments + regular/VIP
            const impactResp = await providerService.validateLeave(profile.id, {
                start_date: leaveFormData.start_date,
                end_date: leaveFormData.end_date,
                leave_kind: (leaveFormData as any).leave_kind,
                start_time: leaveFormData.start_time || undefined,
                end_time: leaveFormData.end_time || undefined
            });
            const impact = impactResp?.data;
            const policy = impact?.policy || {};
            const shouldOpenModal =
                (impact?.total_appointments || 0) > 0 ||
                (impact?.regular_customers || 0) > 0 ||
                (impact?.vip_customers || 0) > 0;
            if (shouldOpenModal && (policy.vip_requires_owner_approval || policy.emergency_requires_handling || (impact?.regular_customers || 0) > 0)) {
                setLeaveImpact(impact);
                setIsImpactModalOpen(true);
                return;
            }

            const resp = await providerService.addLeave(profile.id, { ...leaveFormData, ui_language: language });
            showLeaveSubmitResult(resp);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "normal", leave_kind: "FULL_DAY", start_time: "", end_time: "", note: "" } as any);
            fetchData();
        } catch (error) {
            showToast(parseApiMessage(error as any, 'providers.err_add_leave'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitLeaveWithOwnerApproval = async () => {
        if (!profile?.id) return;
        setIsSubmitting(true);
        try {
            const resp = await providerService.addLeave(profile.id, { ...leaveFormData, allow_owner_approval: true, ui_language: language } as any);
            setIsImpactModalOpen(false);
            setLeaveImpact(null);
            showLeaveSubmitResult(resp);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "normal", leave_kind: "FULL_DAY", start_time: "", end_time: "", note: "" } as any);
            fetchData();
        } catch (error: any) {
            showToast(parseApiMessage(error, 'providers.err_add_leave'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitLeaveAnyway = async () => {
        if (!profile?.id) return;
        setIsSubmitting(true);
        try {
            const resp = await providerService.addLeave(profile.id, { ...leaveFormData, ui_language: language } as any);
            setIsImpactModalOpen(false);
            setLeaveImpact(null);
            showLeaveSubmitResult(resp);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "normal", leave_kind: "FULL_DAY", start_time: "", end_time: "", note: "" } as any);
            fetchData();
        } catch (error: any) {
            showToast(parseApiMessage(error, 'providers.err_add_leave'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResignationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resignationFormData.requested_last_date) {
            showToast(t('providers.all_fields_required'), "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await businessService.submitResignation(resignationFormData);
            showToast(t('employee.resignation_sent'));
            setIsResignationModalOpen(false);
            setResignationFormData({ requested_last_date: "", reason: "" });
            fetchData();
        } catch (error: any) {
            showToast(parseApiMessage(error, 'providers.err_resignation'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                    {t('dashboard.loading')}
                </p>
            </div>
        );
    }

    const completedToday = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
    const businessTimeZone = business?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const toDayKey = (value: Date | string) =>
        new Intl.DateTimeFormat("en-CA", { timeZone: businessTimeZone }).format(new Date(value));
    const todayStr = toDayKey(new Date());
    const sortedAppointments = [...appointments].sort(
        (a: any, b: any) => new Date(a?.start_time || 0).getTime() - new Date(b?.start_time || 0).getTime()
    );
    const todaysAppointments = sortedAppointments.filter((a: any) => toDayKey(a?.start_time) === todayStr);
    const upcomingAppointments = sortedAppointments.filter((a: any) => toDayKey(a?.start_time) > todayStr);
    // Backend /queues/my-tasks already returns current open tasks for today in business timezone.
    // Avoid extra date filtering here to prevent hiding valid assigned tasks.
    const todayQueueTasks = tasks;
    const todayAssignedWorkCount = todayQueueTasks.length + todaysAppointments.length;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-8">
            {/* Header / Profile Card */}
            <div className="relative overflow-hidden bg-slate-900 pt-12 pb-24 px-6">
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
                
                <div className="relative flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight uppercase">
                                {user?.full_name || profile?.name}
                            </h1>
                            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mt-1">
                                {profile?.role || t('admin.role')} • {profile?.department || 'Staff'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsResignationModalOpen(true)}
                            className="px-4 py-2.5 bg-white/5 hover:bg-rose-500/20 text-white/80 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                            {t('employee.resign')}
                        </button>
                        <button 
                            onClick={() => logout()}
                            className="p-3 bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 rounded-2xl border border-white/10 transition-all active:scale-95"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Language Selection Bar */}
                <div className="mt-8 flex justify-end">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 px-4 py-2">
                        <LanguageSwitcher />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="px-6 -mt-12 grid grid-cols-2 gap-4 relative z-20">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-2"
                >
                    <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="mt-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employee.stats.completed_today')}</p>
                        <p className="text-2xl font-black text-slate-900">{completedToday}</p>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-2"
                >
                    <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div className="mt-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employee.stats.pending_tasks')}</p>
                        <p className="text-2xl font-black text-slate-900">{pendingTasks}</p>
                    </div>
                </motion.div>
            </div>

            {/* Main Tabs */}
            <div className="px-6 mt-8">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                    <button 
                        onClick={() => setActiveTab('work')}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            activeTab === 'work' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Briefcase className="h-4 w-4" />
                        {t('employee.my_work')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('leave')}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            activeTab === 'leave' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <CalendarClock className="h-4 w-4" />
                        {t('employee.leave_application')}
                    </button>
                </div>

                <div className="mt-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'work' ? (
                            <motion.div 
                                key="work"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                {tasks.length === 0 && todaysAppointments.length === 0 && upcomingAppointments.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                                            <LayoutDashboard className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">{t('employee.no_tasks')}</h3>
                                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider text-center px-8">{t('employee.no_tasks_desc')}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employee.today_assigned_work')}</p>
                                                    <p className="text-2xl font-black text-slate-900 mt-1">{todayAssignedWorkCount}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.today')}</p>
                                                </div>
                                                <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                                    <CalendarClock className="h-6 w-6" />
                                                </div>
                                            </div>
                                            <div className="mt-4 grid grid-cols-3 gap-3">
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employee.join_queue')}</p>
                                                    <p className="text-lg font-black text-slate-900 mt-1">{todayQueueTasks.length}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('appointments.title')}</p>
                                                    <p className="text-lg font-black text-slate-900 mt-1">{todaysAppointments.length}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employee.upcoming_assigned')}</p>
                                                    <p className="text-lg font-black text-slate-900 mt-1">{upcomingAppointments.length}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {t('appointments.title')} • {t('dashboard.today')}
                                                </p>
                                                <span className="text-[10px] font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                    {todaysAppointments.length}
                                                </span>
                                            </div>
                                            {todaysAppointments.length > 0 ? (
                                                <div className="mt-5 space-y-3">
                                                    {todaysAppointments.slice(0, 5).map((a: any) => (
                                                        <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-900 truncate">{appointmentCustomerLabel(a)}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {getLocalizedLabel(a?.service?.translations || a?.service?.name, 'services.title')}
                                                                </p>
                                                            </div>
                                                            <span className="text-[10px] font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                                {localizedStatus(a.appointment_state || a.status)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="mt-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {t('employee.no_appointments_today')}
                                                </p>
                                            )}
                                        </div>

                                        {upcomingAppointments.length > 0 && (
                                            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employee.upcoming_assigned')}</p>
                                                        <p className="text-2xl font-black text-slate-900 mt-1">{upcomingAppointments.length}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('employee.plan_leave_safely')}</p>
                                                    </div>
                                                    <div className="h-12 w-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                                                        <CalendarClock className="h-6 w-6" />
                                                    </div>
                                                </div>
                                                <div className="mt-5 space-y-3">
                                                    {upcomingAppointments.slice(0, 3).map((a: any) => (
                                                        <div key={`upcoming-${a.id}`} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-900 truncate">{appointmentCustomerLabel(a)}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    {new Date(a.start_time).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {getLocalizedLabel(a?.service?.translations || a?.service?.name, 'services.title')}
                                                                </p>
                                                            </div>
                                                            <span className="text-[10px] font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                                {localizedStatus(a.appointment_state || a.status)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {t('employee.current_queue')}
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 mt-1">{todayQueueTasks.length}</p>
                                        </div>

                                        {todayQueueTasks.map((task, idx) => (
                                        <motion.div 
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                            #{task.ticket_number}
                                                        </span>
                                                        <span className={cn(
                                                            "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider",
                                                            task.status === 'serving' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                                                        )}>
                                                            {t(`status.${task.status}`)}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-slate-900 pt-1 leading-tight uppercase tracking-tight">
                                                        {task.customer_name}
                                                    </h3>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                                        {queueTaskServiceLabel(task)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t('employee.joined_at')}</p>
                                                    <p className="text-xs font-extrabold text-slate-900">{new Date(task.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex gap-3">
                                                {task.status === 'waiting' && (
                                                    <button 
                                                        disabled={isSubmitting}
                                                        onClick={() => handleStartTask(task)}
                                                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                                        {t('employee.start_task')}
                                                    </button>
                                                )}
                                                {task.status === 'serving' && (
                                                    <button 
                                                        disabled={isSubmitting}
                                                        onClick={() => handleCompleteTask(task)}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                                    >
                                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                        {t('employee.complete_task')}
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                        ))}
                                        {todayQueueTasks.length === 0 && (
                                            <div className="rounded-[32px] border border-slate-100 bg-white px-6 py-8 text-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {t('employee.no_join_queue_today')}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="leave"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-8"
                            >
                                {/* Application Form */}
                                <form onSubmit={handleLeaveSubmit} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                            <CalendarOff className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{t('employee.apply_new_leave')}</h3>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.start_date')}</label>
                                            <input 
                                                required
                                                type="date"
                                                min={minLeaveDate}
                                                value={leaveFormData.start_date}
                                                onChange={e => setLeaveFormData({
                                                    ...leaveFormData,
                                                    start_date: e.target.value,
                                                    end_date: leaveFormData.end_date < e.target.value ? e.target.value : leaveFormData.end_date
                                                })}
                                                className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.end_date')}</label>
                                            <input 
                                                required
                                                type="date"
                                                min={leaveFormData.start_date || minLeaveDate}
                                                value={leaveFormData.end_date}
                                                onChange={e => setLeaveFormData({...leaveFormData, end_date: e.target.value})}
                                                className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.leave_category')}</label>
                                        <select 
                                            value={leaveFormData.leave_type}
                                            onChange={e => setLeaveFormData({...leaveFormData, leave_type: e.target.value})}
                                            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="emergency">Emergency</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.leave_kind')}</label>
                                        <select
                                            value={(leaveFormData as any).leave_kind}
                                            onChange={e => setLeaveFormData({ ...(leaveFormData as any), leave_kind: e.target.value })}
                                            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none"
                                        >
                                            <option value="FULL_DAY">{t('providers.full_day')}</option>
                                            <option value="HALF_DAY">{t('providers.half_day')}</option>
                                            <option value="EMERGENCY">{t('providers.emergency_time')}</option>
                                        </select>
                                    </div>

                                    {(['HALF_DAY', 'EMERGENCY'].includes(String((leaveFormData as any).leave_kind || '').toUpperCase())) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.start_time')}</label>
                                                <input
                                                    type="time"
                                                    value={leaveFormData.start_time}
                                                    onChange={e => setLeaveFormData({ ...(leaveFormData as any), start_time: e.target.value })}
                                                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.end_time')}</label>
                                                <input
                                                    type="time"
                                                    value={leaveFormData.end_time}
                                                    onChange={e => setLeaveFormData({ ...(leaveFormData as any), end_time: e.target.value })}
                                                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.notes')}</label>
                                        <textarea 
                                            required
                                            rows={3}
                                            placeholder={t('providers.notes_placeholder')}
                                            value={leaveFormData.note}
                                            onChange={e => setLeaveFormData({...leaveFormData, note: e.target.value})}
                                            className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                                        />
                                    </div>

                                    <button 
                                        disabled={isSubmitting}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('providers.submit_leave')}
                                    </button>
                                </form>

                                {/* Leave History */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('employee.applied_leaves')}</h3>
                                    {leaves.length === 0 ? (
                                        <div className="py-12 bg-white/50 border border-slate-100 border-dashed rounded-[32px] flex items-center justify-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('providers.no_history')}</p>
                                        </div>
                                    ) : (
                                        leaves.map((leave, idx) => {
                                            const leaveStatus = String(leave?.status || "PENDING").toUpperCase();
                                            const leaveStatusKey = leaveStatus.toLowerCase();
                                            return (
                                            <div key={leave.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className={cn(
                                                            "h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center",
                                                            leaveStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600" :
                                                            leaveStatus === 'REJECTED' ? "bg-rose-50 text-rose-600" :
                                                            "bg-amber-50 text-amber-600"
                                                        )}>
                                                            <CalendarOff className="h-6 w-6" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-900 tracking-tight">
                                                                {formatLeaveDateRange(leave.start_date, leave.end_date, language)}
                                                            </p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-wrap items-center gap-1.5">
                                                                {leaveTypeLabel(leave.leave_type)}
                                                                <span className="text-slate-200">•</span>
                                                                {leaveKindLabel(leave.leave_kind)}
                                                                <span className="text-slate-200">•</span>
                                                                <span className={cn(
                                                                    "font-black",
                                                                    leaveStatus === 'APPROVED' ? "text-emerald-500" :
                                                                    leaveStatus === 'REJECTED' ? "text-rose-500" :
                                                                    "text-amber-500"
                                                                )}>{t(`employee.status_${leaveStatusKey}`)}</span>
                                                            </p>
                                                            {leave.note && (
                                                                <p className="text-[10px] text-slate-500 mt-1.5 font-medium normal-case tracking-normal line-clamp-2">
                                                                    {leave.note}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-slate-300 shrink-0 hidden sm:block" />
                                                </div>
                                                {leaveStatus === 'REJECTED' && leave.rejection_reason && (
                                                    <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">
                                                            {t("employee.rejection_feedback_label")}
                                                        </p>
                                                        <p className="text-sm font-medium text-slate-800 leading-snug">
                                                            {leave.rejection_reason}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )})
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">My Schedule</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(weeklySchedule || []).map((s: any) => (
                                            <div key={`${s.day_of_week}-${s.id || ''}`} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day {s.day_of_week}</p>
                                                <p className="text-sm font-bold text-slate-900 mt-1">
                                                    {s.is_available ? `${String(s.start_time || '').slice(0, 5)} - ${String(s.end_time || '').slice(0, 5)}` : 'Off'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upcoming Day Offs</p>
                                            <div className="mt-2 space-y-1">
                                                {(myDayOffs || []).slice(0, 5).map((d: any) => (
                                                    <p key={d.id} className="text-xs font-semibold text-slate-700">
                                                        {d.day_off_date} {d.day_off_type === 'partial' ? `(${String(d.start_time || '').slice(0, 5)}-${String(d.end_time || '').slice(0, 5)})` : '(Full day)'}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blocked Slots</p>
                                            <div className="mt-2 space-y-1">
                                                {(myBlockTimes || []).slice(0, 5).map((b: any) => (
                                                    <p key={b.id} className="text-xs font-semibold text-slate-700">
                                                        {b.block_date} ({String(b.start_time || '').slice(0, 5)}-{String(b.end_time || '').slice(0, 5)})
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Toasts */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={cn(
                            "fixed bottom-24 left-6 right-6 z-220 p-4 rounded-2xl shadow-xl border flex items-center gap-3 md:left-auto md:right-8 md:bottom-8 md:w-80",
                            toast.type === 'success' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-rose-600 border-rose-500 text-white"
                        )}
                    >
                        {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <p className="text-xs font-bold uppercase tracking-wide">{toast.message}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Smart Leave Impact Modal */}
            {isImpactModalOpen && (
                <div className="fixed inset-0 z-210 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('providers.manage_leave')}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {t('appointments.title')} • {leaveImpact?.total_appointments || 0}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsImpactModalOpen(false); setLeaveImpact(null); }}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <X className="h-6 w-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('dashboard.overview')}</p>
                                <div className="mt-3 grid grid-cols-3 gap-3">
                                    <div className="rounded-2xl bg-white border border-slate-100 p-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                        <p className="text-lg font-black text-slate-900">{leaveImpact?.total_appointments || 0}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white border border-slate-100 p-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regular</p>
                                        <p className="text-lg font-black text-slate-900">{leaveImpact?.regular_customers || 0}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white border border-slate-100 p-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VIP</p>
                                        <p className="text-lg font-black text-slate-900">{leaveImpact?.vip_customers || 0}</p>
                                    </div>
                                </div>
                            </div>

                            {(leaveImpact?.appointments || []).slice(0, 5).length > 0 && (
                                <div className="space-y-3">
                                    {(leaveImpact.appointments || []).slice(0, 5).map((a: any) => (
                                        <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">{a?.customer?.full_name || t('admin.customer')}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                {String(a.status || '').toLowerCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-3">
                                {leaveImpact?.policy?.emergency_requires_handling ? (
                                    <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3">
                                        <p className="text-xs font-bold text-rose-700">{t('providers.err_emergency_leave_requires_handling')}</p>
                                    </div>
                                ) : leaveImpact?.policy?.vip_requires_owner_approval ? (
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                                        <p className="text-xs font-bold text-amber-700">{t('providers.err_vip_leave_requires_owner')}</p>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                        <p className="text-xs font-bold text-slate-700">
                                            {t('providers.leave_status_updated_notify_warning')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setIsImpactModalOpen(false); setLeaveImpact(null); }}
                                    className="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    {t('providers.cancel')}
                                </button>
                                {leaveImpact?.policy?.emergency_requires_handling ? null : leaveImpact?.policy?.vip_requires_owner_approval ? (
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={submitLeaveWithOwnerApproval}
                                        className="flex-1 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('providers.approve_and_notify')}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={submitLeaveAnyway}
                                        className="flex-1 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('providers.submit_leave')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Resignation Modal */}
            {isResignationModalOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <form onSubmit={handleResignationSubmit} className="p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('employee.resign')}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('employee.resign_desc')}</p>
                                </div>
                                <button type="button" onClick={() => setIsResignationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <X className="h-6 w-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employee.last_date')}</label>
                                    <input 
                                        required
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={resignationFormData.requested_last_date}
                                        onChange={e => setResignationFormData({...resignationFormData, requested_last_date: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employee.resign_reason')}</label>
                                    <textarea 
                                        rows={3}
                                        placeholder={t('providers.notes_placeholder')}
                                        value={resignationFormData.reason}
                                        onChange={e => setResignationFormData({...resignationFormData, reason: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={isSubmitting}
                                className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-xl shadow-rose-100"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                {t('employee.submit_resignation')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bottom Nav Hint (Mobile) */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-t border-slate-200 flex items-center justify-around px-6 md:hidden z-30 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                <button 
                    onClick={() => setActiveTab('work')}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-all",
                        activeTab === 'work' ? "text-indigo-600 scale-110" : "text-slate-400"
                    )}
                >
                    <Briefcase className="h-5 w-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{t('employee.my_work')}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('leave')}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-all",
                        activeTab === 'leave' ? "text-indigo-600 scale-110" : "text-slate-400"
                    )}
                >
                    <CalendarClock className="h-5 w-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{t('employee.leave_application')}</span>
                </button>
            </div>
        </div>
    );
}

export default function EmployeeDashboard() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
                    Loading Portal...
                </p>
            </div>
        }>
            <EmployeeDashboardContent />
        </Suspense>
    );
}
