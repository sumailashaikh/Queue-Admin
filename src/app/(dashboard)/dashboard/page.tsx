"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Users,
  Share2,
  QrCode,
  Monitor,
  X,
  Printer,
  CheckCircle2,
  Bell,
  Clock,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { queueService } from "@/services/queueService";
import { businessService } from "@/services/businessService"; // Assuming businessService is needed for business data
import { providerService } from "@/services/providerService";
import { appointmentService } from "@/services/appointmentService";
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
  const [stats, setStats] = useState([
    {
      name: "dashboard.future_appointments",
      value: "0",
      icon: CalendarCheck,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      name: "dashboard.current_queue",
      value: "0",
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null); // State to hold business data
  const [isQRModalOpen, setIsQRModalOpen] = useState(false); // State for QR modal visibility
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [leaveAlerts, setLeaveAlerts] = useState<any[]>([]);

  const refreshLeaveAlerts = async (businessId: string) => {
    const n = await providerService.getPendingLeaveCount(businessId);
    setPendingLeaveCount(n);
    const alerts = await providerService.getLeaveAlerts(businessId);
    setLeaveAlerts(alerts || []);
  };

  const handleLeaveAction = async (
    leaveId: string,
    action: "APPROVED" | "REJECTED",
  ) => {
    if (!business?.id) return;
    if (action === "REJECTED") {
      const reason = window.prompt(
        tr("dashboard.enter_rejection_reason", "Enter rejection reason"),
      );
      if (!reason || !reason.trim()) return;
      await providerService.updateLeaveStatus(leaveId, action, reason.trim());
    } else {
      await providerService.updateLeaveStatus(leaveId, action);
    }
    await refreshLeaveAlerts(business.id);
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = () => {
    setShowInstallModal(true);
  };

  const confirmInstall = async () => {
    if (!deferredPrompt) return;
    setShowInstallModal(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const myBusiness = await businessService.getMyBusiness(); // Fetch business data
        setBusiness(myBusiness);

        if (myBusiness?.id && user?.role === "owner") {
          try {
            await refreshLeaveAlerts(myBusiness.id);
          } catch {
            setPendingLeaveCount(0);
            setLeaveAlerts([]);
          }
        } else {
          setPendingLeaveCount(0);
          setLeaveAlerts([]);
        }

        const queues = await queueService.getMyQueues();
        let currentQueueCount = 0;
        try {
          const queueEntryLists = await Promise.all(
            queues.map((q: any) => queueService.getQueueEntriesToday(q.id)),
          );
          currentQueueCount = queueEntryLists.reduce((acc, entries) => {
            const activeCount = (entries || []).filter(
              (e: any) => e.status === "waiting" || e.status === "serving",
            ).length;
            return acc + activeCount;
          }, 0);
        } catch (err) {
          console.error("Failed to fetch current queue count:", err);
        }

        let futureAppointments = 0;
        try {
          const appointments =
            await appointmentService.getBusinessAppointments();
          const now = new Date();
          futureAppointments = (appointments || []).filter((appt: any) => {
            if (!appt?.start_time) return false;
            const startAt = new Date(appt.start_time);
            const status = String(appt.status || "").toLowerCase();
            const isFuture = startAt.getTime() > now.getTime();
            const isActiveAppointment = [
              "scheduled",
              "confirmed",
              "requested",
              "pending",
              "rescheduled",
            ].includes(status);
            return isFuture && isActiveAppointment;
          }).length;
        } catch (err) {
          console.error("Failed to fetch future appointments:", err);
        }

        setStats([
          {
            name: "dashboard.future_appointments",
            value: futureAppointments.toString(),
            icon: CalendarCheck,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            name: "dashboard.current_queue",
            value: currentQueueCount.toString(),
            icon: Users,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ]);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [user?.id, user?.role]);

  return (
    <div className="relative">
      {/* Verification Pending Overlay */}
      {user?.status === "pending" && (
        <div className="absolute inset-0 z-50 rounded-[40px] bg-white/60 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="max-w-md p-10 bg-white border border-slate-100 shadow-2xl rounded-[40px] animate-in zoom-in-95 duration-500">
            <div className="h-20 w-20 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto mb-8">
              <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-4">
              {t("dashboard.verification_pending")}
            </h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              {t("dashboard.verification_desc")}
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
              {t("dashboard.approval_24h")}
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700",
          user?.status === "pending" &&
            "opacity-40 pointer-events-none select-none filter blur-[1px]",
        )}
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("dashboard.business_overview")}
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            {t("dashboard.real_time_insights")}
          </p>
        </div>

        {user?.role === "owner" && pendingLeaveCount > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-950">
                  {t("dashboard.pending_leave_alert", {
                    count: pendingLeaveCount,
                  })}
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-900/80">
                  {t("dashboard.pending_leave_alert_hint")}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/providers"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              {t("dashboard.pending_leave_alert_cta")}
            </Link>
          </div>
        )}

        {user?.role === "owner" && leaveAlerts.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-rose-950">{t("dashboard.leave_requests")}</p>
              <Link
                href="/dashboard/providers"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-[11px] font-bold uppercase tracking-wider text-white"
              >
                {t("dashboard.manage")}
              </Link>
            </div>
            <div className="space-y-2">
              {leaveAlerts.slice(0, 5).map((a: any) => (
                <div
                  key={a.leave_id}
                  className="rounded-xl border border-rose-100 bg-white px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      {a.employee_name} - {a.leave_date}
                    </p>
                    {a.high_priority && (
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                        {t("dashboard.emergency")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">
                    {t("dashboard.tasks_label")}: {a.affected_tasks} | {t("dashboard.appointments_label")}:{" "}
                    {a.affected_appointments}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {a.leave_status === "PENDING"
                      ? t("dashboard.new_leave_request")
                      : t("dashboard.approved_leave")}
                  </p>
                  {a.leave_status === "PENDING" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() =>
                          handleLeaveAction(a.leave_id, "APPROVED")
                        }
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-600 px-3 text-[10px] font-bold uppercase tracking-wider text-white"
                      >
                        {t("dashboard.approve")}
                      </button>
                      <button
                        onClick={() =>
                          handleLeaveAction(a.leave_id, "REJECTED")
                        }
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-rose-600 px-3 text-[10px] font-bold uppercase tracking-wider text-white"
                      >
                        {t("dashboard.reject")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group cursor-default"
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    stat.bg,
                    stat.color,
                    "p-3 rounded-xl transition-transform duration-300 group-hover:scale-105",
                  )}
                >
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t(stat.name)}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  {loading ? "..." : stat.value}
                </h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="h-4 w-4 text-slate-500" />
              {t("dashboard.smart_tools")}
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setIsQRModalOpen(true)}
                  disabled={!business}
                  className="flex-1 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center justify-center gap-3 text-indigo-600 hover:bg-indigo-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <QrCode className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {t("dashboard.business_qr")}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (business) {
                      window.location.href = `/display/${business.slug}`;
                    }
                  }}
                  disabled={!business}
                  className="flex-1 p-4 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-center justify-center gap-3 text-amber-600 hover:bg-amber-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Monitor className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {t("dashboard.tv_mode")}
                  </span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t("dashboard.public_link")}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {business
                      ? `${window.location.host}/${business.slug}`
                      : t("dashboard.loading")}
                  </p>
                  <button
                    onClick={() => {
                      if (!business?.slug) {
                        setToastMessage(
                          tr("dashboard.loading_business_details", "Loading business details..."),
                        );
                        setTimeout(() => setToastMessage(null), 3000);
                        return;
                      }
                      const url = `${window.location.origin}/p/${business.slug}`;
                      navigator.clipboard.writeText(url);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 3000);
                    }}
                    disabled={!business?.slug}
                    className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-slate-200 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showInstallBtn ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full p-6 bg-emerald-600 border-2 border-emerald-500 rounded-2xl flex items-center justify-between gap-4 text-white hover:bg-emerald-700 transition-all group shadow-lg shadow-emerald-200 hover:-translate-y-1 active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Monitor className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-widest">
                        {t("dashboard.install_app")}
                      </p>
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">
                        {t("dashboard.save_to_home_screen")}
                      </p>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                    +
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setShowInstallModal(true)}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-between gap-4 text-slate-600 hover:bg-slate-100 hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                      <Monitor className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-widest">
                        {t("dashboard.pwa_setup") || "Get Web App"}
                      </p>
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter text-slate-500">
                        {t("dashboard.installation_guide")}
                      </p>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    →
                  </div>
                </button>
              )}

              <button
                onClick={() => (window.location.href = "/dashboard/queue")}
                className="w-full flex items-center justify-center bg-slate-900 border border-slate-900 text-white rounded-xl px-4 py-3 text-sm font-semibold tracking-wide shadow-sm hover:bg-slate-800 transition-all active:scale-95"
              >
                {t("dashboard.manage_live_queue")}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 w-full flex flex-col items-center justify-center space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t("dashboard.queue_system_version")}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        {isQRModalOpen && business && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 flex flex-col items-center text-center space-y-8">
                <div className="flex items-center justify-between w-full mb-2">
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                    {t("dashboard.business_qr_code")}
                  </h3>
                  <button
                    onClick={() => setIsQRModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="h-6 w-6 text-slate-400" />
                  </button>
                </div>

                <div className="p-8 bg-white border-4 border-slate-50 rounded-[48px] shadow-inner">
                  <QRCodeSVG
                    value={`${window.location.origin}/p/${business.slug}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-bold text-slate-900">
                    {business.name}
                  </p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                    {t("dashboard.scan_to_join")}
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Printer className="h-4 w-4" /> {t("dashboard.print_qr_code")}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Dashboard Toast Notifications */}
        {(isCopied || toastMessage) && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-emerald-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400/50 backdrop-blur-md">
              <CheckCircle2 className="h-5 w-5 text-white/50" />
              <p className="text-sm font-bold uppercase tracking-wider">
                {toastMessage || t("dashboard.link_copied_toast")}
              </p>
            </div>
          </div>
        )}

        {/* PWA Install Modal */}
        {showInstallModal && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 flex flex-col items-center text-center space-y-6">
                <div className="flex w-full justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                    {t("dashboard.install_app")}
                  </h3>
                  <button
                    onClick={() => setShowInstallModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="h-6 w-6 text-slate-400" />
                  </button>
                </div>
                <div className="h-20 w-20 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto text-emerald-600">
                  <Monitor className="h-10 w-10" />
                </div>

                {deferredPrompt ? (
                  <>
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        {t("dashboard.save_to_home_screen")}{" "}
                        {t("dashboard.real_time_insights").toLowerCase()}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full mt-4">
                      <button
                        onClick={() => setShowInstallModal(false)}
                        className="py-4 bg-slate-50 text-slate-600 rounded-[20px] text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-all"
                      >
                        {t("common.cancel") || "Maybe Later"}
                      </button>
                      <button
                        onClick={confirmInstall}
                        className="py-4 bg-slate-900 text-white rounded-[20px] text-xs font-bold uppercase tracking-wider shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                      >
                        {t("dashboard.install") || "Install"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full space-y-6 text-left">
                    <p className="text-sm font-medium text-slate-500 leading-relaxed text-center">
                      {t("dashboard.install_app_guide_desc") ||
                        "Your browser doesn't support automatic installation. Follow these quick steps to install QueueUp to your device manually."}
                    </p>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex gap-4 items-start">
                        <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-slate-900 shrink-0">
                          1
                        </div>
                        <div className="space-y-1 mt-0.5">
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {t("dashboard.ios_safari")}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {t("dashboard.step_1_desc")}
                          </p>
                        </div>
                      </div>
                      <hr className="border-slate-200" />
                      <div className="flex gap-4 items-start">
                        <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-slate-900 shrink-0">
                          2
                        </div>
                        <div className="space-y-1 mt-0.5">
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {t("dashboard.desktop_chrome")}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {t("dashboard.step_2_desc")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowInstallModal(false)}
                      className="w-full py-4 bg-slate-900 text-white rounded-[20px] text-xs font-bold uppercase tracking-wider shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                    >
                      {t("common.got_it") || "Got It!"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
