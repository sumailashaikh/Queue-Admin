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
    ExternalLink
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { businessService, Business } from "@/services/businessService";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const { business, setBusiness } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: business?.name || "",
        description: business?.description || "",
        address: business?.address || "",
        phone: business?.phone || "",
        whatsapp_number: business?.whatsapp_number || "",
        slug: business?.slug || "",
        open_time: business?.open_time || "09:00:00",
        close_time: business?.close_time || "21:00:00",
        is_closed: business?.is_closed || false
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
                is_closed: business.is_closed || false
            });
        }
    }, [business]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business?.id) return;

        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const updated = await businessService.updateBusiness(business.id, formData);
            setBusiness(updated);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to update business profile");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!business?.id) return;
        const confirmed = confirm("WARNING: This will permanently delete your business and all associated data. This action cannot be undone. Proceed?");
        if (!confirmed) return;

        try {
            await businessService.deleteBusiness(business.id);
            window.location.href = '/setup';
        } catch (err) {
            alert("Failed to delete business");
        }
    };

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Settings</h1>
                <p className="text-sm font-semibold text-slate-600">Manage your public profile and business details.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="pro-card p-8 space-y-6">
                        {success && (
                            <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700 text-sm font-bold animate-in slide-in-from-top-2">
                                <CheckCircle2 className="h-5 w-5" />
                                Business profile updated successfully!
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
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Business Name</label>
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
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Description</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                                    <textarea
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                        placeholder="Tell customers about your business..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Business Phone</label>
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
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">WhatsApp Number (E.164)</label>
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
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Public URL (Slug)</label>
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
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Operating Hours & Store Status</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Open At</label>
                                    <input
                                        type="time"
                                        value={formData.open_time}
                                        onChange={(e) => setFormData({ ...formData, open_time: e.target.value })}
                                        className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all min-w-[120px]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Close At</label>
                                    <input
                                        type="time"
                                        value={formData.close_time}
                                        onChange={(e) => setFormData({ ...formData, close_time: e.target.value })}
                                        className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all min-w-[120px]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Current Status</label>
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
                                        {formData.is_closed ? "MANUALLY CLOSED" : "ACTIVE & OPEN"}
                                    </button>
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
                                        SAVING...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        SAVE CHANGES
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="pro-card p-6 bg-slate-900 border-none text-white relative overflow-hidden group">
                        <div className="absolute -right-8 -top-8 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                            <QrCode className="h-32 w-32" />
                        </div>

                        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-primary" />
                            Digital Entry QR
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
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Public Join URL</p>
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
                                        setToastMessage("Link copied to clipboard!");
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
                                Open Public Page
                            </a>
                        </div>
                    </div>

                    <div className="pro-card p-6 border-red-100 dark:border-red-900/30">
                        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Danger Zone
                        </h3>
                        <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
                            Deleting your business will remove all queues, services, and appointment history. This cannot be undone.
                        </p>
                        <button
                            onClick={handleDelete}
                            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-red-200"
                        >
                            Delete Business Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border-2 backdrop-blur-md transition-all bg-emerald-500 text-white border-emerald-400/50">
                        <CheckCircle2 className="h-5 w-5" />
                        <p className="text-sm font-bold uppercase tracking-wider">{toastMessage}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
