"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
    Briefcase, 
    Calendar,
    CalendarClock, 
    CheckCircle2, 
    Clock, 
    Copy,
    LayoutDashboard, 
    Loader2, 
    LogOut, 
    Play, 
    Plus,
    Trash2,
    User,
    CalendarOff,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Star,
    X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency, validateLanguage, formatLeaveDateRange } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { providerService, ServiceProvider } from "@/services/providerService";
import { queueService, QueueEntry } from "@/services/queueService";
import { appointmentService } from "@/services/appointmentService";

function pickQueueEntryServiceId(
    entry: QueueEntry,
    action: "start" | "complete",
    myProviderId?: string | null,
    myUserId?: string | null
): string | null {
    const allRows = entry.queue_entry_services || [];
    const scopedRows = allRows.filter((s: any) => {
        if (!myProviderId && !myUserId) return true;
        const assignedProviderId = String((s as any)?.assigned_provider_id || "");
        const assignedUserId = String((s as any)?.assigned_to || "");
        if (myProviderId && assignedProviderId === String(myProviderId)) return true;
        if (myUserId && assignedUserId === String(myUserId)) return true;
        return false;
    });
    // Fallback: legacy rows may miss assigned fields; still allow action on open step.
    const rows = scopedRows.length > 0 ? scopedRows : allRows;
    if (!rows?.length) return null;
    if (action === "complete") {
        const active = rows.find((s) => s.task_status === "in_progress");
        if (active?.id) return active.id;
        // Fallback: some legacy rows are marked serving at entry level
        // while task status was not advanced to in_progress.
        const open = rows.find((s) => !["done", "cancelled"].includes(String(s.task_status || "").toLowerCase()));
        if (open?.id) return open.id;
        return rows[0]?.id ?? null;
    }
    const pending = rows.find((s) => s.task_status === "pending");
    if (pending?.id) return pending.id;
    const open = rows.find((s) => !["done", "cancelled"].includes(String(s.task_status || "").toLowerCase()));
    if (open?.id) return open.id;
    return rows[0]?.id ?? null;
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
    // Always prefer currently selected UI language for on-screen validation/errors.
    const effectiveUiLanguage = String(language || (business as any)?.language || "en");
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    
    const [profile, setProfile] = useState<ServiceProvider | null>(null);
    const [tasks, setTasks] = useState<QueueEntry[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
    const [myDayOffs, setMyDayOffs] = useState<any[]>([]);
    const [myBlockTimes, setMyBlockTimes] = useState<any[]>([]);
    const [attendanceToday, setAttendanceToday] = useState<any | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [scheduleDraft, setScheduleDraft] = useState<any[]>([]);
    const [dayOffForm, setDayOffForm] = useState({
        day_off_date: "",
        day_off_type: "full_day",
        part_of_day: "morning",
        start_time: "",
        end_time: "",
        reason: ""
    });
    const [blockForm, setBlockForm] = useState({
        block_date: "",
        start_time: "",
        end_time: "",
        reason: ""
    });
    const [editingDayOffId, setEditingDayOffId] = useState<string | null>(null);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [leaveVisibleMode, setLeaveVisibleMode] = useState<"initial" | "all">("initial");
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taskActionEntryId, setTaskActionEntryId] = useState<string | null>(null);
    const [taskStatusOverrides, setTaskStatusOverrides] = useState<Record<string, "in_progress" | "done">>({});
    const overrideTimersRef = useRef<Record<string, any>>({});
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
        leave_type: "planned",
        leave_kind: "FULL_DAY",
        start_time: "",
        end_time: "",
        note: "",
        request_type: "leave"
    });
    
    // Resignation State
    const [isResignationModalOpen, setIsResignationModalOpen] = useState(false);
    const [resignationFormData, setResignationFormData] = useState({
        requested_last_date: "",
        reason: ""
    });
    const [resignationRequests, setResignationRequests] = useState<any[]>([]);
    
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const minLeaveDate = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
    const todayDate = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
    const upcomingDayOffs = useMemo(() => {
        const list = (myDayOffs || [])
            .filter((d: any) => {
                const date = String(d?.day_off_date || "").slice(0, 10);
                if (!date) return false;
                if (date < todayDate) return false;
                const status = String(d?.status || "").toUpperCase();
                // Hide rejected fallback leave rows in upcoming list.
                if (status === "REJECTED") return false;
                return true;
            })
            .sort((a: any, b: any) =>
                String(a?.day_off_date || "").localeCompare(String(b?.day_off_date || ""))
            );
        return list;
    }, [myDayOffs, todayDate]);
    const dayNames = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);
    const scheduleI18n = useMemo(() => {
        const dict: any = {
            en: {
                my_schedule: "My Schedule",
                apply_all: "Apply To All",
                working: "Working",
                off: "Off",
                upcoming_day_offs: "Upcoming Day Offs",
                no_upcoming_day_offs: "No upcoming day offs.",
                full_day: "Full Day",
                half_day: "Half Day",
                edit_day_off: "Edit Day Off",
                add_day_off: "Add Day Off",
                morning: "Morning",
                evening: "Evening",
                custom: "Custom",
                update_day_off: "Update Day Off",
                reason: "Reason",
                blocked_slots: "Blocked Slots",
                no_blocked_slots: "No blocked slots.",
                edit_block_time: "Edit Block Time",
                add_block_time: "Add Block Time",
                update_block_time: "Update Block Time",
                cancel: "Cancel",
                unavailability_form: "Unavailability Form",
                entry_type: "Entry Type",
                day_off_option: "Day Off",
                block_out_option: "Block Out",
                event_date: "Date",
                save_entry: "Save Entry",
                update_entry: "Update Entry",
                leave_view_initial: "Show Initial",
                leave_view_all: "View More",
                leave_view_less: "View Less",
                owner_staff_timing: "Owner Staff Timing",
                shift_hours: "Shift Hours"
            },
            ar: {
                my_schedule: "جدولي",
                apply_all: "تطبيق على الكل",
                working: "دوام",
                off: "إجازة",
                upcoming_day_offs: "الإجازات القادمة",
                no_upcoming_day_offs: "لا توجد إجازات قادمة.",
                full_day: "يوم كامل",
                half_day: "نصف يوم",
                edit_day_off: "تعديل الإجازة",
                add_day_off: "إضافة إجازة",
                morning: "صباح",
                evening: "مساء",
                custom: "مخصص",
                update_day_off: "تحديث الإجازة",
                reason: "السبب",
                blocked_slots: "الفترات المحجوزة",
                no_blocked_slots: "لا توجد فترات محجوزة.",
                edit_block_time: "تعديل الفترة",
                add_block_time: "إضافة فترة",
                update_block_time: "تحديث الفترة",
                cancel: "إلغاء",
                unavailability_form: "نموذج عدم التوفر",
                entry_type: "نوع الإدخال",
                day_off_option: "إجازة",
                block_out_option: "حظر وقت",
                event_date: "التاريخ",
                save_entry: "حفظ",
                update_entry: "تحديث",
                leave_view_initial: "عرض أولي",
                leave_view_all: "عرض المزيد",
                leave_view_less: "عرض أقل",
                owner_staff_timing: "توقيت الموظفين من المالك",
                shift_hours: "ساعات الدوام"
            },
            hi: {
                my_schedule: "मेरा शेड्यूल",
                apply_all: "सभी पर लागू करें",
                working: "काम",
                off: "छुट्टी",
                upcoming_day_offs: "आने वाली छुट्टियां",
                no_upcoming_day_offs: "कोई आने वाली छुट्टी नहीं।",
                full_day: "पूरा दिन",
                half_day: "आधा दिन",
                edit_day_off: "छुट्टी संपादित करें",
                add_day_off: "छुट्टी जोड़ें",
                morning: "सुबह",
                evening: "शाम",
                custom: "कस्टम",
                update_day_off: "छुट्टी अपडेट करें",
                reason: "कारण",
                blocked_slots: "ब्लॉक स्लॉट्स",
                no_blocked_slots: "कोई ब्लॉक स्लॉट नहीं।",
                edit_block_time: "ब्लॉक समय संपादित करें",
                add_block_time: "ब्लॉक समय जोड़ें",
                update_block_time: "ब्लॉक समय अपडेट करें",
                cancel: "रद्द करें",
                unavailability_form: "अनुपलब्धता फ़ॉर्म",
                entry_type: "एंट्री प्रकार",
                day_off_option: "छुट्टी",
                block_out_option: "ब्लॉक आउट",
                event_date: "तारीख",
                save_entry: "सेव करें",
                update_entry: "अपडेट करें",
                leave_view_initial: "शुरुआती दिखाएं",
                leave_view_all: "और देखें",
                leave_view_less: "कम देखें",
                owner_staff_timing: "ओनर स्टाफ टाइमिंग",
                shift_hours: "शिफ्ट घंटे"
            },
            es: {
                my_schedule: "Mi horario",
                apply_all: "Aplicar a todo",
                working: "Trabajando",
                off: "Libre",
                upcoming_day_offs: "Próximos días libres",
                no_upcoming_day_offs: "No hay días libres próximos.",
                full_day: "Día completo",
                half_day: "Medio día",
                edit_day_off: "Editar día libre",
                add_day_off: "Agregar día libre",
                morning: "Mañana",
                evening: "Tarde",
                custom: "Personalizado",
                update_day_off: "Actualizar día libre",
                reason: "Motivo",
                blocked_slots: "Bloques de tiempo",
                no_blocked_slots: "No hay bloques de tiempo.",
                edit_block_time: "Editar bloque",
                add_block_time: "Agregar bloque",
                update_block_time: "Actualizar bloque",
                cancel: "Cancelar",
                unavailability_form: "Formulario de indisponibilidad",
                entry_type: "Tipo de registro",
                day_off_option: "Día libre",
                block_out_option: "Bloqueo",
                event_date: "Fecha",
                save_entry: "Guardar",
                update_entry: "Actualizar",
                leave_view_initial: "Mostrar inicial",
                leave_view_all: "Ver mas",
                leave_view_less: "Ver menos",
                owner_staff_timing: "Horario del personal del propietario",
                shift_hours: "Horas de turno"
            }
        };
        return dict[language] || dict.en;
    }, [language]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const showLeaveSubmitResult = (resp: any) => {
        if (resp?.owner_in_app_notified) {
            showToast(t('employee.leave_success'));
            return;
        }
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
        const key = String(error?.response?.data?.message_key || "").trim();
        if (key && key.includes(".")) {
            const localized = t(key as any, error?.response?.data, effectiveUiLanguage as any);
            if (localized !== key) return localized;
        }
        const raw = String(error?.response?.data?.message || error?.message || "").trim();
        if (!raw) return t(fallbackKey as any);
        if (raw.includes(".")) {
            const localized = t(raw as any, error?.response?.data, effectiveUiLanguage as any);
            return localized !== raw ? localized : raw;
        }
        // Backward-compatible mapping for older backend plain-text errors.
        const lower = raw.toLowerCase();
        if (lower.includes('scheduled appointments on this date')) {
            return t('employee.leave_conflict_warning' as any, {}, effectiveUiLanguage as any);
        }
        if (lower.includes('unable to validate leave conflicts because appointment assignment schema')) {
            return t('providers.err_leave_conflict_validation_schema' as any, {}, effectiveUiLanguage as any);
        }
        if (lower.includes('unable to validate leave conflicts right now')) {
            return t('providers.err_leave_conflict_validation_unavailable' as any, {}, effectiveUiLanguage as any);
        }
        return raw;
    };

    const leaveTypeLabel = (leaveType?: string) => {
        const v = String(leaveType || "").toLowerCase();
        if (v === "normal") return ({ en: "Normal", ar: "عادي", hi: "सामान्य", es: "Normal" } as any)[language] || "Normal";
        if (v === "planned") return ({ en: "Planned", ar: "مخطط", hi: "योजनाबद्ध", es: "Planificado" } as any)[language] || "Planned";
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
    const localizeDayOffReason = (reason?: string) => {
        const raw = String(reason || "").trim();
        if (!raw) return "";
        const normalized = raw.toLowerCase().replace(/\s+/g, " ");
        const dict: Record<string, Record<string, string>> = {
            "on leave": { en: "On Leave", ar: "في إجازة", hi: "छुट्टी पर", es: "De permiso" },
            "leave": { en: "Leave", ar: "إجازة", hi: "छुट्टी", es: "Permiso" },
            "vacation": { en: "Vacation", ar: "إجازة", hi: "अवकाश", es: "Vacaciones" },
            "emergency leave": { en: "Emergency Leave", ar: "إجازة طارئة", hi: "आपातकालीन छुट्टी", es: "Permiso de emergencia" },
            "other reason": { en: "Other Reason", ar: "سبب آخر", hi: "अन्य कारण", es: "Otro motivo" },
        };
        const baseLang = String(language || "en").split("-")[0];
        if (dict[normalized]?.[baseLang]) return dict[normalized][baseLang];
        return raw;
    };
    const appointmentCustomerLabel = (a: any) =>
        a?.customer?.full_name ||
        a?.customer?.name ||
        a?.guest_name ||
        a?.customer_name ||
        t('admin.customer');
    const servicesForCurrentEmployee = (entry: QueueEntry) =>
        (entry.queue_entry_services || []).filter((s: any) => {
            const assignedProviderId = String(s?.assigned_provider_id || "");
            const assignedUserId = String(s?.assigned_to || "");
            const myProviderId = String(profile?.id || "");
            const myUserId = String(user?.id || "");
            if (myProviderId && assignedProviderId && assignedProviderId === myProviderId) return true;
            if (myUserId && assignedUserId && assignedUserId === myUserId) return true;
            return false;
        });
    const relevantServicesForUi = (entry: QueueEntry) => {
        const mine = servicesForCurrentEmployee(entry);
        return mine.length > 0 ? mine : (entry.queue_entry_services || []);
    };
    const hasTaskInProgress = (entry: QueueEntry) =>
        !!relevantServicesForUi(entry).some((s: any) => ["in_progress", "in-progress", "serving"].includes(String(s?.task_status || "").toLowerCase()));
    const hasOpenTask = (entry: QueueEntry) =>
        !!relevantServicesForUi(entry).some((s: any) => !["done", "completed", "cancelled", "skipped"].includes(String(s?.task_status || "").toLowerCase()));

    const fetchData = useCallback(async () => {
        try {
            const [profileData, tasksData, apptsData] = await Promise.all([
                providerService.getMyProfile(),
                queueService.getMyTasks(),
                appointmentService.getMyAssignedAppointments()
            ]);

            // Update core dashboard data first so task state refresh is never blocked
            // by optional leave/day-off/block-time API failures.
            setProfile(profileData);
            setTasks(() => {
                const overrides = taskStatusOverrides;
                const merged = (tasksData || []).map((task: any) => {
                    const nextServices = (task.queue_entry_services || []).map((s: any) => {
                        const forced = overrides[String(s?.id || "")];
                        return forced ? { ...s, task_status: forced } : s;
                    });
                    const hasInProgress = nextServices.some((s: any) => String(s?.task_status || "").toLowerCase() === "in_progress");
                    const hasOpen = nextServices.some((s: any) => !["done", "completed", "cancelled", "skipped"].includes(String(s?.task_status || "").toLowerCase()));
                    return {
                        ...task,
                        status: hasInProgress ? "serving" : (hasOpen ? task.status : "completed"),
                        queue_entry_services: nextServices
                    };
                });
                return merged as any;
            });
            setAppointments(apptsData || []);

            let leavesData: any[] = [];
            let availabilityData: any[] = [];
            let dayOffData: any[] = [];
            let blockData: any[] = [];
            let resignationData: any[] = [];

            if (profileData?.id) {
                const [leavesRes, availabilityRes, dayOffRes, blockRes, attendanceRes, resignationRes] = await Promise.allSettled([
                    providerService.getLeaves(profileData.id),
                    providerService.getAvailability(profileData.id),
                    providerService.getDayOffs(profileData.id),
                    providerService.getBlockTimes(profileData.id),
                    providerService.getAttendance(profileData.id),
                    businessService.getMyResignationRequests()
                ]);
                leavesData = leavesRes.status === "fulfilled" ? (leavesRes.value || []) : [];
                availabilityData = availabilityRes.status === "fulfilled" ? (availabilityRes.value || []) : [];
                dayOffData = dayOffRes.status === "fulfilled" ? (dayOffRes.value || []) : [];
                blockData = blockRes.status === "fulfilled" ? (blockRes.value || []) : [];
                resignationData = resignationRes.status === "fulfilled" ? (resignationRes.value || []) : [];
                const attendanceData = attendanceRes.status === "fulfilled" ? (attendanceRes.value || { today: null, records: [] }) : { today: null, records: [] };
                setAttendanceToday(attendanceData.today || null);
                setAttendanceRecords(attendanceData.records || []);
            }

            // Keep rejected items visible so employee can read manager feedback/rejection reason.
            setLeaves(leavesData || []);
            setWeeklySchedule(availabilityData || []);
            setScheduleDraft(
                Array.from({ length: 7 }).map((_, day) => {
                    const row = (availabilityData || []).find((a: any) => Number(a.day_of_week) === day);
                    return {
                        day_of_week: day,
                        is_available: row ? !!row.is_available : true,
                        start_time: row?.start_time ? String(row.start_time).slice(0, 5) : "10:00",
                        end_time: row?.end_time ? String(row.end_time).slice(0, 5) : "20:00"
                    };
                })
            );
            setMyDayOffs(dayOffData || []);
            setMyBlockTimes(blockData || []);
            setResignationRequests(resignationData || []);
        } catch (error) {
            console.error("Failed to fetch employee data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, taskStatusOverrides]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
            fetchData();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleStartTask = async (entry: QueueEntry) => {
        const serviceTaskId = pickQueueEntryServiceId(entry, "start", profile?.id, user?.id);
        if (!serviceTaskId) {
            showToast(t("employee.err_no_service_task"), "error");
            return;
        }
        setTaskActionEntryId(entry.id);
        try {
            await queueService.startTask(serviceTaskId);
            setTaskStatusOverrides((prev) => ({ ...prev, [serviceTaskId]: "in_progress" }));
            if (overrideTimersRef.current[serviceTaskId]) clearTimeout(overrideTimersRef.current[serviceTaskId]);
            overrideTimersRef.current[serviceTaskId] = setTimeout(() => {
                setTaskStatusOverrides((prev) => {
                    const next = { ...prev };
                    delete next[serviceTaskId];
                    return next;
                });
            }, 10000);
            setTasks((prev) =>
                (prev || []).map((task) => {
                    if (task.id !== entry.id) return task;
                    const nextServices = (task.queue_entry_services || []).map((s: any) =>
                        s.id === serviceTaskId
                            ? { ...s, task_status: "in_progress", started_at: s.started_at || new Date().toISOString() }
                            : s
                    );
                    return { ...task, status: "serving", queue_entry_services: nextServices } as any;
                })
            );
            showToast(t('queue.success_start'));
            // Avoid immediate stale overwrite; sync shortly after optimistic update.
            setTimeout(() => { fetchData(); }, 1200);
        } catch (error) {
            showToast(t('queue.err_start'), "error");
        } finally {
            setTaskActionEntryId(null);
        }
    };

    const handleCompleteTask = async (entry: QueueEntry) => {
        const serviceTaskId = pickQueueEntryServiceId(entry, "complete", profile?.id, user?.id);
        if (!serviceTaskId) {
            showToast(t("employee.err_no_service_task"), "error");
            return;
        }
        setTaskActionEntryId(entry.id);
        try {
            await queueService.completeTask(serviceTaskId);
            setTaskStatusOverrides((prev) => ({ ...prev, [serviceTaskId]: "done" }));
            if (overrideTimersRef.current[serviceTaskId]) clearTimeout(overrideTimersRef.current[serviceTaskId]);
            overrideTimersRef.current[serviceTaskId] = setTimeout(() => {
                setTaskStatusOverrides((prev) => {
                    const next = { ...prev };
                    delete next[serviceTaskId];
                    return next;
                });
            }, 10000);
            setTasks((prev) =>
                (prev || [])
                    .map((task) => {
                        if (task.id !== entry.id) return task;
                        const nextServices = (task.queue_entry_services || []).map((s: any) =>
                            s.id === serviceTaskId
                                ? { ...s, task_status: "done", completed_at: new Date().toISOString() }
                                : s
                        );
                        const hasOpen = nextServices
                            .filter((s: any) => {
                                const assignedProviderId = String(s?.assigned_provider_id || "");
                                const assignedUserId = String(s?.assigned_to || "");
                                const myProviderId = String(profile?.id || "");
                                const myUserId = String(user?.id || "");
                                if (myProviderId && assignedProviderId && assignedProviderId === myProviderId) return true;
                                if (myUserId && assignedUserId && assignedUserId === myUserId) return true;
                                return false;
                            })
                            .some((s: any) => !["done", "completed", "cancelled", "skipped"].includes(String(s?.task_status || "").toLowerCase()));
                        return { ...task, status: hasOpen ? "serving" : "completed", queue_entry_services: nextServices } as any;
                    })
                    .filter((task: any) => String(task?.status || "").toLowerCase() !== "completed")
            );
            showToast(t('queue.success_complete'));
            // Avoid immediate stale overwrite; sync shortly after optimistic update.
            setTimeout(() => { fetchData(); }, 1200);
        } catch (error: any) {
            showToast(parseApiMessage(error, 'queue.err_complete'), "error");
        } finally {
            setTaskActionEntryId(null);
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
        if (!validateLanguage(leaveFormData.note, effectiveUiLanguage)) {
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
            if (shouldOpenModal) {
                setLeaveImpact(impact);
                setIsImpactModalOpen(true);
                return;
            }

            const resp = await providerService.addLeave(profile.id, { ...leaveFormData, ui_language: effectiveUiLanguage });
            showLeaveSubmitResult(resp);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "planned", leave_kind: "FULL_DAY", start_time: "", end_time: "", note: "", request_type: "leave" } as any);
            fetchData();
        } catch (error) {
            showToast(parseApiMessage(error as any, 'providers.err_add_leave'), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnifiedLeaveSubmit = async (e: React.FormEvent) => {
        const reqType = String((leaveFormData as any).request_type || "leave");
        if (reqType === "day_off") {
            e.preventDefault();
            if (!profile?.id || !leaveFormData.start_date) {
                showToast(t("providers.all_fields_required"), "error");
                return;
            }
            if (!validateLanguage(leaveFormData.note || "", effectiveUiLanguage)) {
                showToast(t("common.err_invalid_chars", {}, effectiveUiLanguage as any), "error");
                return;
            }
            const kind = String((leaveFormData as any).leave_kind || "FULL_DAY").toUpperCase();
            const payload: any = {
                day_off_date: leaveFormData.start_date,
                day_off_type: kind === "FULL_DAY" ? "full_day" : "partial",
                start_time: leaveFormData.start_time || undefined,
                end_time: leaveFormData.end_time || undefined,
                reason: leaveFormData.note || "",
                ui_language: effectiveUiLanguage,
            };
            if (payload.day_off_type === "partial" && (!payload.start_time || !payload.end_time)) {
                showToast(t("providers.err_leave_time_required"), "error");
                return;
            }
            setIsSubmitting(true);
            try {
                const leavePayload: any = {
                    start_date: leaveFormData.start_date,
                    end_date: leaveFormData.end_date || leaveFormData.start_date,
                    leave_type: "planned",
                    leave_kind: kind === "FULL_DAY" ? "FULL_DAY" : "HALF_DAY",
                    start_time: kind === "FULL_DAY" ? undefined : (leaveFormData.start_time || undefined),
                    end_time: kind === "FULL_DAY" ? undefined : (leaveFormData.end_time || undefined),
                    note: leaveFormData.note || "",
                    ui_language: effectiveUiLanguage,
                };

                // Same conflict popup flow for day-off requests.
                const impactResp = await providerService.validateLeave(profile.id, {
                    start_date: leavePayload.start_date,
                    end_date: leavePayload.end_date,
                    leave_kind: leavePayload.leave_kind,
                    start_time: leavePayload.start_time,
                    end_time: leavePayload.end_time
                });
                const impact = impactResp?.data;
                const shouldOpenModal =
                    (impact?.total_appointments || 0) > 0 ||
                    (impact?.regular_customers || 0) > 0 ||
                    (impact?.vip_customers || 0) > 0;
                if (shouldOpenModal) {
                    setLeaveImpact(impact);
                    setIsImpactModalOpen(true);
                    return;
                }

                const leaveResp = await providerService.addLeave(profile.id, leavePayload);
                showLeaveSubmitResult(leaveResp);
                setLeaveFormData({ start_date: "", end_date: "", leave_type: "planned", leave_kind: "FULL_DAY", start_time: "", end_time: "", note: "", request_type: "leave" } as any);
                fetchData();
            } catch (error: any) {
                showToast(parseApiMessage(error, "providers.err_add_leave"), "error");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }
        if (reqType === "block_out") {
            e.preventDefault();
            if (!profile?.id || !leaveFormData.start_time || !leaveFormData.end_time) {
                showToast(t("providers.all_fields_required"), "error");
                return;
            }
            const blockDate = todayDate;
            const toMinutes = (value: string) => {
                const [h, m] = String(value || "00:00").split(":").map(Number);
                return (Number(h) || 0) * 60 + (Number(m) || 0);
            };
            if (toMinutes(leaveFormData.end_time) <= toMinutes(leaveFormData.start_time)) {
                showToast(t("providers.err_leave_time_required"), "error");
                return;
            }
            setIsSubmitting(true);
            try {
                await providerService.addBlockTime(profile.id, {
                    block_date: blockDate,
                    start_time: leaveFormData.start_time,
                    end_time: leaveFormData.end_time,
                    reason: leaveFormData.note || "",
                });
                showToast(t("providers.success_availability"));
                setLeaveFormData({ start_date: "", end_date: "", leave_type: "planned", leave_kind: "FULL_DAY", start_time: "", end_time: "", note: "", request_type: "leave" } as any);
                fetchData();
            } catch {
                showToast(t("providers.err_availability"), "error");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }
        await handleLeaveSubmit(e);
    };

    const handleClockAction = async (action: "clock_in" | "clock_out") => {
        if (!profile?.id) return;
        setIsSubmitting(true);
        try {
            await providerService.markAttendance(profile.id, action);
            showToast(action === "clock_in" ? "Clock in recorded" : "Clock out recorded");
            fetchData();
        } catch (error: any) {
            showToast(parseApiMessage(error, "providers.err_availability"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitLeaveWithOwnerApproval = async () => {
        if (!profile?.id) return;
        setIsSubmitting(true);
        try {
            const resp = await providerService.addLeave(profile.id, { ...leaveFormData, allow_owner_approval: true, ui_language: effectiveUiLanguage } as any);
            setIsImpactModalOpen(false);
            setLeaveImpact(null);
            showLeaveSubmitResult(resp);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "planned", leave_kind: "FULL_DAY", start_time: "", end_time: "", note: "", request_type: "leave" } as any);
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
            const resp = await providerService.addLeave(profile.id, { ...leaveFormData, ui_language: effectiveUiLanguage, allow_conflict_override: true } as any);
            setIsImpactModalOpen(false);
            setLeaveImpact(null);
            showLeaveSubmitResult(resp);
            setLeaveFormData({ start_date: "", end_date: "", leave_type: "planned", leave_kind: "FULL_DAY", start_time: "", end_time: "", note: "", request_type: "leave" } as any);
            fetchData();
        } catch (error: any) {
            const key = String(error?.response?.data?.message_key || "");
            if (key === "providers.err_leave_overlap") {
                showToast(t("providers.err_leave_overlap", {}, effectiveUiLanguage as any), "error");
            } else {
                showToast(parseApiMessage(error, 'providers.err_add_leave'), "error");
            }
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

    const handleSaveSchedule = async () => {
        if (!profile?.id) return;
        setIsSubmitting(true);
        try {
            await providerService.updateAvailability(profile.id, scheduleDraft);
            showToast(t("providers.success_availability"));
            fetchData();
        } catch (error) {
            showToast(t("providers.err_availability"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetDayOffForm = () => {
        setEditingDayOffId(null);
        setDayOffForm({
            day_off_date: "",
            day_off_type: "full_day",
            part_of_day: "morning",
            start_time: "",
            end_time: "",
            reason: ""
        });
    };

    const resetBlockForm = () => {
        setEditingBlockId(null);
        setBlockForm({ block_date: "", start_time: "", end_time: "", reason: "" });
    };

    const applySameScheduleToAllDays = () => {
        const template = (scheduleDraft || []).find((s: any) => !!s?.is_available) || scheduleDraft?.[0];
        if (!template) return;
        setScheduleDraft((prev: any[]) =>
            prev.map((row: any) => ({
                ...row,
                is_available: !!template.is_available,
                start_time: template.start_time,
                end_time: template.end_time
            }))
        );
    };

    const handleAddDayOff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id || !dayOffForm.day_off_date) return;
        const normalized = { ...dayOffForm } as any;
        if (normalized.day_off_type === "partial" && !normalized.start_time && !normalized.end_time) {
            if (normalized.part_of_day === "morning") {
                normalized.start_time = "09:00";
                normalized.end_time = "13:00";
            } else if (normalized.part_of_day === "evening") {
                normalized.start_time = "14:00";
                normalized.end_time = "18:00";
            }
        }
        if (normalized.day_off_type === "partial" && (!normalized.start_time || !normalized.end_time)) {
            showToast(t("providers.err_leave_time_required"), "error");
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingDayOffId) {
                await providerService.updateDayOff(editingDayOffId, normalized as any);
            } else {
                await providerService.addDayOff(profile.id, normalized as any);
            }
            showToast(t("providers.success_leave_add"));
            resetDayOffForm();
            fetchData();
        } catch (error) {
            showToast(t("providers.err_add_leave"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditDayOff = (dayOff: any) => {
        setEditingDayOffId(dayOff.id);
        const start = String(dayOff.start_time || "").slice(0, 5);
        const end = String(dayOff.end_time || "").slice(0, 5);
        setDayOffForm({
            day_off_date: String(dayOff.day_off_date || "").slice(0, 10),
            day_off_type: dayOff.day_off_type === "partial" ? "partial" : "full_day",
            part_of_day: start === "09:00" && end === "13:00" ? "morning" : start === "14:00" && end === "18:00" ? "evening" : "custom",
            start_time: start,
            end_time: end,
            reason: dayOff.reason || ""
        } as any);
    };

    const handleDeleteDayOff = async (dayOffId: string) => {
        setIsSubmitting(true);
        try {
            await providerService.deleteDayOff(dayOffId);
            showToast(t("providers.success_leave_delete"));
            if (editingDayOffId === dayOffId) resetDayOffForm();
            fetchData();
        } catch {
            showToast(t("providers.err_delete_leave"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddBlockTime = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id || !blockForm.block_date || !blockForm.start_time || !blockForm.end_time) {
            showToast(t("providers.all_fields_required"), "error");
            return;
        }
        const toMinutes = (value: string) => {
            const [h, m] = String(value || "00:00").split(":").map(Number);
            return (Number(h) || 0) * 60 + (Number(m) || 0);
        };
        if (toMinutes(blockForm.end_time) <= toMinutes(blockForm.start_time)) {
            showToast(t("providers.err_leave_time_required"), "error");
            return;
        }
        const overlaps = (myBlockTimes || []).some((b: any) => {
            if (editingBlockId && b.id === editingBlockId) return false;
            if (String(b.block_date || "") !== String(blockForm.block_date || "")) return false;
            const s = toMinutes(String(b.start_time || "").slice(0, 5));
            const e = toMinutes(String(b.end_time || "").slice(0, 5));
            return toMinutes(blockForm.start_time) < e && toMinutes(blockForm.end_time) > s;
        });
        if (overlaps) {
            showToast("Block time overlaps an existing slot", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingBlockId) {
                await providerService.updateBlockTime(editingBlockId, blockForm as any);
            } else {
                await providerService.addBlockTime(profile.id, blockForm as any);
            }
            showToast(t("providers.success_availability"));
            resetBlockForm();
            fetchData();
        } catch (error) {
            showToast(t("providers.err_availability"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditBlockTime = (block: any) => {
        setEditingBlockId(block.id);
        setBlockForm({
            block_date: String(block.block_date || "").slice(0, 10),
            start_time: String(block.start_time || "").slice(0, 5),
            end_time: String(block.end_time || "").slice(0, 5),
            reason: block.reason || ""
        });
    };

    const handleDeleteBlockTime = async (blockId: string) => {
        setIsSubmitting(true);
        try {
            await providerService.deleteBlockTime(blockId);
            showToast(t("providers.success_availability"));
            if (editingBlockId === blockId) resetBlockForm();
            fetchData();
        } catch {
            showToast(t("providers.err_availability"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayLeaves = useMemo(
        () => (leaves || []).filter((leave: any) => String(leave?.status || "").toUpperCase() !== "REJECTED"),
        [leaves]
    );
    const visibleLeaves = displayLeaves.slice(0, 3);
    const showLeaveToggleDropdown = displayLeaves.length > 3;

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
    const profileBusiness = (profile as any)?.businesses || null;
    const employeeBusiness = business || profileBusiness;
    const businessTimeZone = employeeBusiness?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const toDayKey = (value: Date | string | null | undefined) => {
        if (!value) return "";
        const parsed = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(parsed.getTime())) return "";
        return new Intl.DateTimeFormat("en-CA", { timeZone: businessTimeZone }).format(parsed);
    };
    const todayStr = toDayKey(new Date());
    const ownerStaffOpenTime = String((employeeBusiness as any)?.staff_open_time || employeeBusiness?.open_time || "").slice(0, 5);
    const ownerStaffCloseTime = String((employeeBusiness as any)?.staff_close_time || employeeBusiness?.close_time || "").slice(0, 5);
    const languageToLocale: Record<string, string> = {
        en: "en-US",
        ar: "ar-AE",
        hi: "hi-IN",
        es: "es-ES"
    };
    const formatShiftTimeForLocale = (timeValue: string) => {
        const [hourRaw, minuteRaw] = String(timeValue || "").split(":");
        const hour = Number(hourRaw);
        const minute = Number(minuteRaw);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "--:--";
        const date = new Date(2000, 0, 1, hour, minute, 0, 0);
        return new Intl.DateTimeFormat(languageToLocale[language] || "en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }).format(date);
    };
    const ownerShiftLabel = ownerStaffOpenTime && ownerStaffCloseTime
        ? `${formatShiftTimeForLocale(ownerStaffOpenTime)} - ${formatShiftTimeForLocale(ownerStaffCloseTime)}`
        : "--:-- - --:--";
    const todayClockIn = attendanceToday?.clock_in_time
        ? new Date(attendanceToday.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "--:--";
    const todayClockOut = attendanceToday?.clock_out_time
        ? new Date(attendanceToday.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "--:--";
    const attendanceStatus = attendanceToday?.clock_out_time
        ? "clocked_out"
        : attendanceToday?.clock_in_time
            ? "clocked_in"
            : "not_marked";
    const canClockIn = !!profile?.id && !isSubmitting && !attendanceToday?.clock_in_time;
    const canClockOut = !!profile?.id && !isSubmitting && !!attendanceToday?.clock_in_time && !attendanceToday?.clock_out_time;
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
                                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <CalendarClock className="h-3.5 w-3.5" /> {scheduleI18n.owner_staff_timing}
                                    </p>
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{scheduleI18n.shift_hours}</p>
                                        <p className="text-lg font-black text-slate-900 mt-1">{ownerShiftLabel}</p>
                                    </div>
                                </div>

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
                                            {(() => {
                                                const servingByTask = hasTaskInProgress(task);
                                                const displayStatus = servingByTask ? "serving" : task.status;
                                                const statusValue = String(task.status || "").toLowerCase();
                                                const canStart = (statusValue === 'waiting' || statusValue === 'pending') && hasOpenTask(task) && !servingByTask;
                                                const canComplete = displayStatus === 'serving' && hasOpenTask(task);
                                                return (
                                                    <>
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                            #{task.ticket_number}
                                                        </span>
                                                        <span className={cn(
                                                            "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider",
                                                            displayStatus === 'serving' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                                                        )}>
                                                            {t(`status.${displayStatus}`)}
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
                                                {canStart && (
                                                    <button 
                                                        disabled={taskActionEntryId === task.id}
                                                        onClick={() => handleStartTask(task)}
                                                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {taskActionEntryId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                                        {t('employee.start_task')}
                                                    </button>
                                                )}
                                                {canComplete && (
                                                    <button 
                                                        disabled={taskActionEntryId === task.id}
                                                        onClick={() => handleCompleteTask(task)}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                                    >
                                                        {taskActionEntryId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                        {t('employee.complete_task')}
                                                    </button>
                                                )}
                                            </div>
                                                    </>
                                                );
                                            })()}
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
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                    {/* Application Form */}
                                    <form onSubmit={handleUnifiedLeaveSubmit} className="xl:col-span-7 bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                <CalendarOff className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{t('employee.apply_new_leave')}</h3>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{scheduleI18n.entry_type}</label>
                                            <select
                                                value={String((leaveFormData as any).request_type || "leave")}
                                                onChange={e => setLeaveFormData({ ...(leaveFormData as any), request_type: e.target.value })}
                                                className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none"
                                            >
                                                <option value="leave">{t("providers.manage_leave")}</option>
                                                <option value="day_off">{scheduleI18n.day_off_option}</option>
                                                <option value="block_out">{scheduleI18n.block_out_option}</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                                {String((leaveFormData as any).request_type || "leave") === "block_out" ? scheduleI18n.event_date : t('providers.start_date')}
                                            </label>
                                            <input 
                                                required
                                                type="date"
                                                min={String((leaveFormData as any).request_type || "leave") === "block_out" ? todayDate : minLeaveDate}
                                                max={String((leaveFormData as any).request_type || "leave") === "block_out" ? todayDate : undefined}
                                                value={String((leaveFormData as any).request_type || "leave") === "block_out" ? todayDate : leaveFormData.start_date}
                                                disabled={String((leaveFormData as any).request_type || "leave") === "block_out"}
                                                onChange={e => {
                                                    const nextDate = e.target.value;
                                                    if (String((leaveFormData as any).request_type || "leave") === "block_out") {
                                                        setLeaveFormData({
                                                            ...leaveFormData,
                                                            start_date: todayDate
                                                        });
                                                        return;
                                                    }
                                                    setLeaveFormData({
                                                        ...leaveFormData,
                                                        start_date: nextDate,
                                                        end_date: leaveFormData.end_date < nextDate ? nextDate : leaveFormData.end_date
                                                    });
                                                }}
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

                                        <div className={cn("space-y-2", String((leaveFormData as any).request_type || "leave") !== "leave" && "hidden")}>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.leave_category')}</label>
                                        <select 
                                            value={leaveFormData.leave_type}
                                            onChange={e => setLeaveFormData({...leaveFormData, leave_type: e.target.value})}
                                            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none"
                                        >
                                            <option value="planned">Planned</option>
                                            <option value="emergency">Emergency</option>
                                        </select>
                                        </div>

                                        <div className={cn("space-y-2", String((leaveFormData as any).request_type || "leave") === "block_out" && "hidden")}>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('providers.leave_kind')}</label>
                                        <select
                                            value={(leaveFormData as any).leave_kind}
                                            onChange={e => setLeaveFormData({ ...(leaveFormData as any), leave_kind: e.target.value })}
                                            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none"
                                        >
                                            <option value="FULL_DAY">{t('providers.full_day')}</option>
                                            <option value="HALF_DAY">{t('providers.half_day')}</option>
                                            {String((leaveFormData as any).request_type || "leave") === "leave" && (
                                                <option value="EMERGENCY">{t('providers.emergency_time')}</option>
                                            )}
                                        </select>
                                        </div>

                                        {(String((leaveFormData as any).request_type || "leave") === "block_out" || ['HALF_DAY', 'EMERGENCY'].includes(String((leaveFormData as any).leave_kind || '').toUpperCase())) && (
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
                                            rows={3}
                                            placeholder={t('providers.notes_placeholder')}
                                            value={leaveFormData.note}
                                            onChange={e => setLeaveFormData({...leaveFormData, note: e.target.value})}
                                            className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                                        />
                                        </div>

                                        <button 
                                            disabled={isSubmitting}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                                String((leaveFormData as any).request_type || "leave") === "day_off"
                                                    ? scheduleI18n.add_day_off
                                                    : String((leaveFormData as any).request_type || "leave") === "block_out"
                                                        ? scheduleI18n.add_block_time
                                                        : t('providers.submit_leave')
                                            )}
                                        </button>
                                    </form>

                                    {/* Leave History */}
                                    <div className="xl:col-span-5 bg-white p-5 sm:p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 h-fit">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('employee.applied_leaves')}</h3>
                                                <p className="text-sm font-bold text-slate-900 mt-1">{displayLeaves.length}</p>
                                            </div>
                                            {showLeaveToggleDropdown && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextMode = leaveVisibleMode === "all" ? "initial" : "all";
                                                        setLeaveVisibleMode(nextMode);
                                                        setIsLeaveModalOpen(nextMode === "all");
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                                                >
                                                    {leaveVisibleMode === "all" ? scheduleI18n.leave_view_less : scheduleI18n.leave_view_all}
                                                    {leaveVisibleMode === "all" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                </button>
                                            )}
                                        </div>
                                        {leaves.length === 0 ? (
                                            <div className="py-12 bg-white/50 border border-slate-100 border-dashed rounded-[24px] flex items-center justify-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('providers.no_history')}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {visibleLeaves.map((leave) => {
                                                    const leaveStatus = String(leave?.status || "PENDING").toUpperCase();
                                                    const leaveStatusKey = leaveStatus.toLowerCase();
                                                    return (
                                                        <div key={leave.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className={cn(
                                                                        "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
                                                                        leaveStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600" :
                                                                        leaveStatus === 'REJECTED' ? "bg-rose-50 text-rose-600" :
                                                                        "bg-amber-50 text-amber-600"
                                                                    )}>
                                                                        <CalendarOff className="h-5 w-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-bold text-slate-900 tracking-tight wrap-break-word">
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
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 hidden sm:block" />
                                                            </div>
                                                            {leave.note && (
                                                                <p className="text-[11px] text-slate-500 font-medium normal-case tracking-normal line-clamp-2">
                                                                    {leave.note}
                                                                </p>
                                                            )}
                                                            {leaveStatus === 'REJECTED' && leave.rejection_reason && (
                                                                <div className="rounded-xl border border-rose-100 bg-rose-50/80 px-3 py-2">
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">
                                                                        {t("employee.rejection_feedback_label")}
                                                                    </p>
                                                                    <p className="text-xs font-medium text-slate-800 leading-snug">
                                                                        {leave.rejection_reason}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Resignation History */}
                                    <div className="xl:col-span-5 bg-white p-5 sm:p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 h-fit">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('employee.resignation_history')}</h3>
                                                <p className="text-sm font-bold text-slate-900 mt-1">{resignationRequests.length}</p>
                                            </div>
                                        </div>
                                        {resignationRequests.length === 0 ? (
                                            <div className="py-12 bg-white/50 border border-slate-100 border-dashed rounded-[24px] flex items-center justify-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('providers.no_history')}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {resignationRequests.slice(0, 4).map((req: any) => {
                                                    const status = String(req?.status || "PENDING").toUpperCase();
                                                    const requestedLastDate = String(req?.requested_last_date || "").slice(0, 10);
                                                    const statusTone = status === "APPROVED"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : status === "REJECTED"
                                                            ? "bg-rose-50 text-rose-700 border-rose-100"
                                                            : "bg-amber-50 text-amber-700 border-amber-100";
                                                    return (
                                                        <div key={req.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 space-y-2">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="text-sm font-bold text-slate-900">
                                                                    {requestedLastDate || "--"}
                                                                </p>
                                                                <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border", statusTone)}>
                                                                    {t(`employee.status_${String(status || "pending").toLowerCase()}`)}
                                                                </span>
                                                            </div>
                                                            {req?.reason && (
                                                                <p className="text-xs font-medium text-slate-600">
                                                                    {req.reason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" /> Staff Attendance
                                            </p>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                attendanceStatus === "clocked_out" && "bg-slate-100 text-slate-700",
                                                attendanceStatus === "clocked_in" && "bg-emerald-100 text-emerald-700",
                                                attendanceStatus === "not_marked" && "bg-amber-100 text-amber-700",
                                            )}>
                                                {attendanceStatus === "clocked_out" ? "Clocked Out" : attendanceStatus === "clocked_in" ? "On Duty" : "Not Marked"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Clock In</p>
                                                <p className="text-lg font-black text-slate-900 mt-1">{todayClockIn}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Clock Out</p>
                                                <p className="text-lg font-black text-slate-900 mt-1">{todayClockOut}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                disabled={!canClockIn}
                                                onClick={() => handleClockAction("clock_in")}
                                                className="w-full px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Clock In
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!canClockOut}
                                                onClick={() => handleClockAction("clock_out")}
                                                className="w-full px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Clock Out
                                            </button>
                                        </div>

                                        {attendanceRecords.length > 0 && (
                                            <div className="pt-1 border-t border-slate-100 space-y-2 max-h-44 overflow-auto">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Attendance</p>
                                                {attendanceRecords.slice(0, 5).map((r: any) => (
                                                    <div key={r.id} className="text-[11px] text-slate-500 flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                                                        <span className="font-semibold text-slate-600">{String(r.attendance_date || "")}</span>
                                                        <span className="font-bold">{r.clock_in_time ? new Date(r.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"} - {r.clock_out_time ? new Date(r.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CalendarOff className="h-3.5 w-3.5" /> {scheduleI18n.upcoming_day_offs}</p>
                                        {upcomingDayOffs.length === 0 ? (
                                            <p className="text-xs text-slate-500">{scheduleI18n.no_upcoming_day_offs}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {upcomingDayOffs.slice(0, 8).map((d: any) => (
                                                    <div key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3">
                                                        <div className="text-xs">
                                                            <p className="font-bold text-slate-800">{d.day_off_date}</p>
                                                            <p className="text-slate-600">
                                                                {d.day_off_type === 'partial'
                                                                    ? `${(d.start_time || '').slice(0, 5)}-${(d.end_time || '').slice(0, 5)}`
                                                                    : scheduleI18n.full_day}
                                                            </p>
                                                            {d.reason && <p className="text-slate-500">{localizeDayOffReason(d.reason)}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button type="button" onClick={() => handleDeleteDayOff(d.id)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>



                                    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {scheduleI18n.blocked_slots}</p>
                                        {(myBlockTimes || []).length === 0 ? (
                                            <p className="text-xs text-slate-500">{scheduleI18n.no_blocked_slots}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {(myBlockTimes || []).slice(0, 10).map((b: any) => (
                                                    <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3">
                                                        <div className="text-xs">
                                                            <p className="font-bold text-slate-800">{b.block_date}</p>
                                                            <p className="text-slate-600">{String(b.start_time || '').slice(0, 5)} - {String(b.end_time || '').slice(0, 5)}</p>
                                                            {b.reason && <p className="text-slate-500">{b.reason}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button type="button" onClick={() => handleDeleteBlockTime(b.id)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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

            <AnimatePresence>
                {isLeaveModalOpen && leaveVisibleMode === "all" && displayLeaves.length > 3 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-230 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 12 }}
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-2xl bg-white rounded-[28px] border border-slate-200 shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('employee.applied_leaves')}</h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-1">{displayLeaves.length}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLeaveModalOpen(false);
                                        setLeaveVisibleMode("initial");
                                    }}
                                    className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto space-y-3">
                                {displayLeaves.map((leave) => {
                                    const leaveStatus = String(leave?.status || "PENDING").toUpperCase();
                                    const leaveStatusKey = leaveStatus.toLowerCase();
                                    return (
                                        <div key={leave.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn(
                                                        "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
                                                        leaveStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600" :
                                                            leaveStatus === 'REJECTED' ? "bg-rose-50 text-rose-600" :
                                                                "bg-amber-50 text-amber-600"
                                                    )}>
                                                        <CalendarOff className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 tracking-tight wrap-break-word">
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
                                                    </div>
                                                </div>
                                            </div>
                                            {leave.note && (
                                                <p className="text-[11px] text-slate-500 font-medium normal-case tracking-normal">
                                                    {leave.note}
                                                </p>
                                            )}
                                            {leaveStatus === 'REJECTED' && leave.rejection_reason && (
                                                <div className="rounded-xl border border-rose-100 bg-rose-50/80 px-3 py-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">
                                                        {t("employee.rejection_feedback_label")}
                                                    </p>
                                                    <p className="text-xs font-medium text-slate-800 leading-snug">
                                                        {leave.rejection_reason}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
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
                                                {(() => {
                                                    const statusKey = String(a.status || '').toLowerCase();
                                                    const translated = t(`appointments.${statusKey}` as any, {}, effectiveUiLanguage as any);
                                                    return translated !== `appointments.${statusKey}` ? translated : statusKey;
                                                })()}
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
                                ) : (leaveImpact?.total_appointments || 0) > 0 ? (
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                                        <p className="text-xs font-bold text-amber-700">
                                            {t('employee.leave_conflict_warning', {}, effectiveUiLanguage as any)}
                                        </p>
                                        <p className="mt-1 text-[11px] font-semibold text-amber-700/90">
                                            {t('employee.leave_conflict_confirm_question', {}, effectiveUiLanguage as any)}
                                        </p>
                                        <div className="mt-2" />
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
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('employee.submit_leave_anyway', {}, effectiveUiLanguage as any)}
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
