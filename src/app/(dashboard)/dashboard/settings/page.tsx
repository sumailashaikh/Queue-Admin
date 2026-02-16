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
    Globe
} from "lucide-react";
import { businessService, Business } from "@/services/businessService";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const { business, setBusiness } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: business?.name || "",
        description: business?.description || "",
        address: business?.address || "",
        phone: business?.phone || "",
        slug: business?.slug || ""
    });

    useEffect(() => {
        if (business) {
            setFormData({
                name: business.name,
                description: business.description || "",
                address: business.address || "",
                phone: business.phone || "",
                slug: business.slug
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
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Business Settings</h1>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Manage your public profile and business details.</p>
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
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Business Name</label>
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
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Description</label>
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Business Phone</label>
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Public URL (Slug)</label>
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

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        required
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                disabled={loading}
                                type="submit"
                                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95"
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
                    <div className="pro-card p-6 border-red-100 dark:border-red-900/30">
                        <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Danger Zone
                        </h3>
                        <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
                            Deleting your business will remove all queues, services, and appointment history. This cannot be undone.
                        </p>
                        <button
                            onClick={handleDelete}
                            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-200"
                        >
                            Delete Business Account
                        </button>
                    </div>

                    <div className="pro-card p-6">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2">Need Help?</h3>
                        <p className="text-xs font-bold text-slate-500 leading-relaxed">
                            If you're having trouble configuring your business, our support team is available via WhatsApp.
                        </p>
                        <button className="w-full mt-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
