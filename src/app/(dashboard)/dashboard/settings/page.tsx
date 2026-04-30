"use client";

import { useState, useEffect } from "react";
import {
    Store,
    Save,
    Trash2,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    MapPin,
    Phone,
    FileText,
    Globe,
    QrCode,
    Download,
    Share2,
    ExternalLink,
    X,
    Clock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { businessService, Business } from "@/services/businessService";
import { paymentSettingsService, PaymentSettings } from "@/services/paymentSettingsService";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { formatGlobalPhone } from "@/lib/phoneUtils";
import { useLanguage } from "@/context/LanguageContext";

export default function SettingsPage() {
    const { business, setBusiness } = useAuth();
    const { t, setLanguage } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
    const [upiIdInput, setUpiIdInput] = useState("");
    const [generatedQrUrl, setGeneratedQrUrl] = useState("");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [savingPayment, setSavingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };
    const tr = (key: string, fallback: string) => {
        const translated = t(key);
        return translated === key ? fallback : translated;
    };

    const [formData, setFormData] = useState({
        name: business?.name || "",
        description: business?.description || "",
        address: business?.address || "",
        phone: business?.phone || "",
        whatsapp_number: business?.whatsapp_number || "",
        slug: business?.slug || "",
        open_time: business?.open_time || "09:00:00",
        close_time: business?.close_time || "21:00:00",
        staff_open_time: business?.staff_open_time || business?.open_time || "09:00:00",
        staff_close_time: business?.staff_close_time || business?.close_time || "21:00:00",
        is_closed: business?.is_closed || false,
        currency: business?.currency || "USD",
        timezone: business?.timezone || "UTC",
        language: business?.language || "en"
    });

    useEffect(() => {
        if (business) {
            setFormData({
                name: business.name,
                description: business.description || "",
                address: business.address || "",
                phone: business.phone || "",
                whatsapp_number: business.whatsapp_number || "",
                slug: business.slug,
                open_time: business.open_time || "09:00:00",
                close_time: business.close_time || "21:00:00",
                staff_open_time: (business as any).staff_open_time || business.open_time || "09:00:00",
                staff_close_time: (business as any).staff_close_time || business.close_time || "21:00:00",
                is_closed: business.is_closed || false,
                currency: business.currency || "USD",
                timezone: business.timezone || "UTC",
                language: business.language || "en"
            });
        }
    }, [business]);

    useEffect(() => {
        const loadPaymentSettings = async () => {
            if (!business?.id) return;
            try {
                const settings = await paymentSettingsService.getByBusinessId(business.id);
                setPaymentSettings(settings);
                if (settings?.upi_id) {
                    setUpiIdInput(settings.upi_id);
                    setGeneratedQrUrl(settings.qr_code_url || "");
                }
            } catch (err) {
                setPaymentError(tr('settings.payment_load_error', "Could not load payment settings. Please retry."));
            }
        };
        loadPaymentSettings();
    }, [business?.id]);

    const buildQrFromUpi = (upi: string) => {
        const upiPayload = `upi://pay?pa=${upi}&pn=${encodeURIComponent(business?.name || "Business")}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiPayload)}`;
    };

    const isValidUpi = (upi: string) => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(upi);

    const handleGenerateQr = async () => {
        setPaymentError(null);
        setPaymentSuccess(null);
        const normalized = upiIdInput.trim();
        if (!normalized) {
            setPaymentError(tr('settings.payment_enter_upi', "Please enter a UPI ID."));
            return;
        }
        if (!isValidUpi(normalized)) {
            setPaymentError(tr('settings.payment_invalid_upi', "Invalid UPI ID. Example: example@upi"));
            return;
        }
        setPaymentLoading(true);
        try {
            const qrUrl = buildQrFromUpi(normalized);
            setGeneratedQrUrl(qrUrl);
            setPaymentSuccess(tr('settings.payment_qr_generated', "QR generated successfully."));
        } catch {
            setPaymentError(tr('settings.payment_qr_failed', "Unable to generate QR right now. Please try again."));
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleSavePayment = async () => {
        if (!business?.id) return;
        setPaymentError(null);
        setPaymentSuccess(null);
        const normalized = upiIdInput.trim();
        if (!isValidUpi(normalized)) {
            setPaymentError(tr('settings.payment_invalid_upi', "Invalid UPI ID. Example: example@upi"));
            return;
        }
        if (!generatedQrUrl) {
            setPaymentError(tr('settings.payment_generate_first', "Please generate QR before saving."));
            return;
        }
        setSavingPayment(true);
        try {
            const saved = await paymentSettingsService.save({
                business_id: business.id,
                upi_id: normalized,
            });
            setPaymentSettings(saved);
            setGeneratedQrUrl(saved.qr_code_url);
            setPaymentSuccess(tr('settings.payment_saved', "Payment settings saved successfully."));
        } catch (err: any) {
            setPaymentError(err?.message || tr('settings.payment_save_failed', "Failed to save payment settings."));
        } finally {
            setSavingPayment(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business?.id) return;

        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            // Format phones before saving
            const payload = {
                ...formData,
                phone: formData.phone ? formatGlobalPhone(formData.phone) || formData.phone : "",
                whatsapp_number: formData.whatsapp_number ? formatGlobalPhone(formData.whatsapp_number) || formData.whatsapp_number : ""
            };

            const updated = await businessService.updateBusiness(business.id, payload);

            setBusiness(updated);
            // Apply the business language as default UI language for this session
            if (payload.language) {
                // Avoid server-side profile language write here; business language already drives portal language.
                setLanguage(payload.language, false).catch(() => {});
            }
            // Update local form state with formatted numbers
            setFormData(prev => ({ ...prev, phone: payload.phone, whatsapp_number: payload.whatsapp_number }));
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || t('settings.fail_msg'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!business?.id) return;
        setIsDeleting(true);
        try {
            await businessService.deleteBusiness(business.id);
            window.location.href = '/setup';
        } catch (err: any) {
            showToast(err.message || t('settings.delete_error'), 'error');
            setShowDeleteModal(false);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('settings.title')}</h1>
                <p className="text-sm font-semibold text-slate-600">{t('settings.description')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="pro-card p-8 space-y-6">
                        {success && (
                            <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700 text-sm font-bold animate-in slide-in-from-top-2">
                                <CheckCircle2 className="h-5 w-5" />
                                {t('settings.success_msg')}
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold">
                                <AlertTriangle className="h-5 w-5" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t('settings.business_name')}</label>
                                <div className="relative">
                                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t('settings.business_desc')}</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                                    <textarea
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                        placeholder={t('settings.business_desc_placeholder')}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t('settings.business_phone')}</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            required
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t('settings.whatsapp_number')}</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                        <input
                                            type="tel"
                                            placeholder="91XXXXXXXXXX"
                                            value={formData.whatsapp_number}
                                            onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t('settings.public_url')}</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            required
                                            type="text"
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                {t('settings.regional_localization')}
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings.currency')}</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="INR">INR (₹)</option>
                                        <option value="AED">AED (د.إ)</option>
                                        <option value="AUD">AUD ($)</option>
                                        <option value="CAD">CAD ($)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings.timezone')}</label>
                                    <select
                                        value={formData.timezone}
                                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                                    >
                                        <option value="UTC">UTC (Universal)</option>
                                        <option value="America/New_York">Eastern Time (ET)</option>
                                        <option value="America/Chicago">Central Time (CT)</option>
                                        <option value="America/Denver">Mountain Time (MT)</option>
                                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                        <option value="Europe/London">London (GMT/BST)</option>
                                        <option value="Europe/Berlin">Central European Time</option>
                                        <option value="Asia/Dubai">Dubai (GST)</option>
                                        <option value="Asia/Kolkata">India (IST)</option>
                                        <option value="Asia/Singapore">Singapore (SGT)</option>
                                        <option value="Australia/Sydney">Sydney (AEST)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-700 dark:text-slate-100 shrink-0" strokeWidth={2.25} aria-hidden />
                                {t('settings.operating_hours')}
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 shrink-0" strokeWidth={2.25} />
                                        {t('settings.open_at')}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={(formData as any).staff_open_time}
                                            onChange={(e) => setFormData({ ...formData, staff_open_time: e.target.value })}
                                            className="w-full pl-3 pr-3 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all min-w-[120px] scheme-light dark:scheme-dark"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 shrink-0" strokeWidth={2.25} />
                                        {t('settings.close_at')}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={(formData as any).staff_close_time}
                                            onChange={(e) => setFormData({ ...formData, staff_close_time: e.target.value })}
                                            className="w-full pl-3 pr-3 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all min-w-[120px] scheme-light dark:scheme-dark"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings.current_status')}</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_closed: !formData.is_closed })}
                                        className={cn(
                                            "w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-2 shadow-sm",
                                            formData.is_closed
                                                ? "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
                                                : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                                        )}
                                    >
                                        <div className={cn("h-1.5 w-1.5 rounded-full", formData.is_closed ? "bg-red-600" : "bg-emerald-600")} />
                                        {formData.is_closed ? t('settings.status_closed') : t('settings.status_open')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-700 dark:text-slate-100 shrink-0" strokeWidth={2.25} aria-hidden />
                                General Staff Time
                            </label>
                            <p className="text-[11px] text-slate-500 pl-1">
                                This common timing is applied for all staff members.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 shrink-0" strokeWidth={2.25} />
                                        Staff Open At
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={formData.open_time}
                                            onChange={(e) => setFormData({ ...formData, open_time: e.target.value })}
                                            className="w-full pl-3 pr-3 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all min-w-[120px] scheme-light dark:scheme-dark"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 shrink-0" strokeWidth={2.25} />
                                        Staff Close At
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={formData.close_time}
                                            onChange={(e) => setFormData({ ...formData, close_time: e.target.value })}
                                            className="w-full pl-3 pr-3 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all min-w-[120px] scheme-light dark:scheme-dark"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                disabled={loading}
                                type="submit"
                                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t('settings.saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        {t('settings.save_changes')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                </div>

                <div className="space-y-6">
                    <div className="pro-card p-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2 text-slate-800">
                            <QrCode className="h-4 w-4 text-primary" />
                            {t('settings.payment_title')}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mb-4">
                            {t('settings.payment_desc')}
                        </p>

                        <div className="mb-3 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide bg-slate-50 border-slate-200 text-slate-600">
                            {paymentSettings?.upi_id ? t('settings.payment_status_complete') : t('settings.payment_status_missing')}
                        </div>

                        {paymentError && (
                            <div className="mb-3 p-3 rounded-xl border border-red-100 bg-red-50 text-red-600 text-xs font-bold">
                                {paymentError}
                            </div>
                        )}
                        {paymentSuccess && (
                            <div className="mb-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 text-xs font-bold">
                                {paymentSuccess}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t('settings.payment_upi_label')}</label>
                                <input
                                    value={upiIdInput}
                                    onChange={(e) => setUpiIdInput(e.target.value)}
                                    placeholder={t('settings.payment_upi_placeholder')}
                                    className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleGenerateQr}
                                    disabled={paymentLoading}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 disabled:bg-slate-600"
                                >
                                    {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                                    {t('settings.payment_generate_qr')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSavePayment}
                                    disabled={savingPayment}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:bg-blue-400"
                                >
                                    {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {t('settings.payment_save')}
                                </button>
                            </div>
                        </div>

                        {generatedQrUrl && (
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center gap-2">
                                <img src={generatedQrUrl} alt="UPI QR preview" className="h-44 w-44 rounded-xl border border-slate-200 bg-white p-2 object-contain" />
                                <p className="text-[11px] font-semibold text-slate-500 text-center break-all">{upiIdInput}</p>
                            </div>
                        )}
                    </div>

                    <div className="pro-card p-6 bg-slate-900 border-none text-white relative overflow-hidden group">
                        <div className="absolute -right-8 -top-8 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                            <QrCode className="h-32 w-32" />
                        </div>

                        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-primary" />
                            {t('settings.digital_qr')}
                        </h3>

                        <div className="flex flex-col items-center gap-6 relative z-10">
                            <div className="p-4 bg-white rounded-2xl shadow-2xl">
                                <QRCodeSVG
                                    value={`${window.location.origin}/p/${business?.slug}`}
                                    size={160}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            <div className="text-center space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.public_join_url')}</p>
                                <p className="text-xs font-bold text-white/80 lowercase break-all px-4">
                                    {window.location.origin}/p/{business?.slug}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={() => {
                                        const svg = document.querySelector(".pro-card svg") as SVGElement;
                                        if (svg) {
                                            const svgData = new XMLSerializer().serializeToString(svg);
                                            const canvas = document.createElement("canvas");
                                            const ctx = canvas.getContext("2d");
                                            const img = new Image();
                                            img.onload = () => {
                                                canvas.width = img.width;
                                                canvas.height = img.height;
                                                ctx?.drawImage(img, 0, 0);
                                                const pngFile = canvas.toDataURL("image/png");
                                                const downloadLink = document.createElement("a");
                                                downloadLink.download = `${business?.slug}-qr-code.png`;
                                                downloadLink.href = pngFile;
                                                downloadLink.click();
                                            };
                                            img.src = "data:image/svg+xml;base64," + btoa(svgData);
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/10"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    PNG
                                </button>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/p/${business?.slug}`;
                                        navigator.clipboard.writeText(url);
                                        setToastMessage(t('settings.link_copied'));
                                        setTimeout(() => setToastMessage(null), 3000);
                                    }}
                                    className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20"
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                    Link
                                </button>
                            </div>

                            <a
                                href={`/p/${business?.slug}`}
                                target="_blank"
                                className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-900 transition-colors"
                            >
                                <ExternalLink className="h-3 w-3" />
                                {t('settings.open_public_page')}
                            </a>
                        </div>
                    </div>

                    <div className="pro-card p-6 border-red-100 dark:border-red-900/30">
                        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {t('settings.danger_zone')}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
                            {t('settings.danger_desc')}
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-red-200"
                        >
                            {t('settings.delete_business')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className={cn(
                        "px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border-2 backdrop-blur-md transition-all text-white",
                        toastType === 'error' ? "bg-red-500 border-red-400/50" : "bg-emerald-500 border-emerald-400/50"
                    )}>
                        {toastType === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                        <p className="text-sm font-bold uppercase tracking-wider">{toastMessage}</p>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 flex flex-col items-center text-center space-y-8">
                            <div className="h-20 w-20 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto text-red-500 transition-transform hover:scale-110 duration-500">
                                <Trash2 className="h-10 w-10" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('settings.danger_zone')}</h3>
                                <p className="text-sm font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                                    {t('settings.delete_confirm')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="py-4 bg-slate-50 text-slate-600 rounded-[20px] text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-all"
                                >
                                    {t('common.cancel') || 'Keep It'}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="py-4 bg-red-500 text-white rounded-[20px] text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-200 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.confirm_delete') || 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
