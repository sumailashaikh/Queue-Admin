"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Clock3,
  IndianRupee,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { cn, validateLanguage } from "@/lib/utils";

type ServiceItem = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  duration_minutes?: number | null;
  is_active?: boolean;
};

type FormState = {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "",
  is_active: true,
};

export default function ServicesPage() {
  const { business } = useAuth();
  const { t, language } = useLanguage();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<ServiceItem[]>("/services/my");
      setServices(res?.data || []);
    } catch {
      showToast(t("services.err_add"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [business?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => `${s.name} ${s.description || ""}`.toLowerCase().includes(q));
  }, [services, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (service: ServiceItem) => {
    setEditing(service);
    setForm({
      name: service.name || "",
      description: service.description || "",
      price: String(service.price ?? ""),
      duration_minutes: String(service.duration_minutes ?? ""),
      is_active: service.is_active !== false,
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    if (!business?.id) return;
    if (!form.name.trim() || !form.price.trim() || !form.duration_minutes.trim()) {
      showToast(t("services.all_fields_required"), "error");
      return;
    }

    const price = Number(form.price);
    const duration = Number(form.duration_minutes);
    if (Number.isNaN(price) || Number.isNaN(duration) || price < 0 || duration < 0) {
      showToast(t("services.err_negative_values"), "error");
      return;
    }
    if (!validateLanguage(form.name.trim(), language) || !validateLanguage(form.description.trim(), language)) {
      showToast(t("common.err_invalid_chars"), "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        duration_minutes: duration,
        is_active: form.is_active,
      };

      if (editing?.id) {
        const original = services.find((s) => s.id === editing.id);
        if (original) {
          const hasChanges =
            payload.name !== String(original.name || "").trim() ||
            String(payload.description || "") !== String(original.description || "").trim() ||
            Number(payload.price) !== Number(original.price || 0) ||
            Number(payload.duration_minutes) !== Number(original.duration_minutes || 0) ||
            Boolean(payload.is_active) !== (original.is_active !== false);
          if (!hasChanges) {
            showToast(t("services.no_changes_detected"), "error");
            return;
          }
        }
        await api.patch(`/services/${editing.id}`, payload);
        showToast(t("services.success_update"));
      } else {
        await api.post("/services", { ...payload, business_id: business?.id });
        showToast(t("services.success_add"));
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await loadServices();
    } catch (error: any) {
      const msg = String(error?.response?.data?.message || "").toLowerCase();
      if (msg.includes("already exists")) showToast(t("services.err_duplicate"), "error");
      else showToast(editing ? t("services.err_update") : t("services.err_add"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (serviceId: string) => {
    setDeleteId(serviceId);
    try {
      await api.delete(`/services/${serviceId}`);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      showToast(t("services.confirm_delete"));
    } catch {
      showToast(t("services.delete_fail"), "error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              {t("services.title")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">{t("services.subtitle")}</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("services.new_service")}
          </button>
        </div>

        <div className="mt-4 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("services.search_placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">{t("services.syncing")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-slate-300" />
          <p className="mt-3 text-lg font-bold text-slate-900">{t("services.empty_workspace")}</p>
          <p className="text-sm text-slate-500">{t("services.no_match")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <div key={service.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 wrap-break-word">{service.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 wrap-break-word">{service.description || t("services.default_desc")}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full border",
                    service.is_active !== false
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200",
                  )}
                >
                  {service.is_active !== false ? t("services.activate") : "Inactive"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <p className="text-[10px] font-black uppercase text-slate-400">{t("services.price_label")}</p>
                  <p className="mt-1 font-bold text-slate-900 flex items-center gap-1">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {Number(service.price || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <p className="text-[10px] font-black uppercase text-slate-400">{t("services.duration_label")}</p>
                  <p className="mt-1 font-bold text-slate-900 flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {Number(service.duration_minutes || 0)}m
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openEdit(service)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => onDelete(service.id)}
                  disabled={deleteId === service.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  {deleteId === service.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-130 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  {editing ? t("services.save_changes") : t("services.create_service")}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">{t("services.add_subtitle")}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("services.name_label")}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t("services.name_placeholder")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("services.price_label")}</label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("services.duration_label")}</label>
                <input
                  type="number"
                  min="0"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("services.desc_label")}</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={t("services.desc_placeholder")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
                />
              </div>
              <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {t("services.activate")}
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? t("services.save_changes") : t("services.create_service")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={cn(
            "fixed right-4 top-20 z-140 px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg",
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white",
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
