"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { businessService } from "@/services/businessService";
import { useAuth } from "@/hooks/useAuth";
import {
    Building2,
    MapPin,
    Phone,
    FileText,
    Loader2,
    CheckCircle2,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SetupPage() {
    const router = useRouter();
    const { refreshBusiness, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        address: "",
        phone: "",
        description: "",
    });

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData(prev => ({
            ...prev,
            name,
            slug: generateSlug(name)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await businessService.createBusiness(formData);
            await refreshBusiness();
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Failed to create business profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
                <div className="max-w-xl w-full">
                    <div className="text-center mb-10 px-4">
                        <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30">
                            <Building2 className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Setup your business</h1>
                        <p className="text-slate-500 mt-2 font-medium">Create your professional profile to start managing queues.</p>
                        <div className="mt-4 flex flex-col items-center gap-2">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center">
                                Logged in? Not your account?
                            </p>
                            <button
                                onClick={logout}
                                className="text-primary text-xs font-bold hover:underline"
                            >
                                Logout and switch account
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="pro-card p-5 md:p-8 space-y-6 md:space-y-8 bg-white shadow-xl shadow-slate-200/50 rounded-2xl md:rounded-3xl">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-bold flex items-center">
                                <div className="h-2 w-2 rounded-full bg-red-600 mr-3 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Business Name Section */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                    <Building2 className="h-3.5 w-3.5 mr-2" />
                                    Business Identity
                                </label>
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-700">Business Name</p>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Acme Business Centre"
                                            value={formData.name}
                                            onChange={handleNameChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-700">Public Link</p>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">queueup.in/</span>
                                            <input
                                                required
                                                type="text"
                                                placeholder="my-business"
                                                value={formData.slug}
                                                onChange={(e) => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                                                className="w-full pl-28 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-4 pt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                    <MapPin className="h-3.5 w-3.5 mr-2" />
                                    Contact & Location
                                </label>
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-700">Business Phone</p>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                required
                                                type="tel"
                                                placeholder="+91 00000 00000"
                                                value={formData.phone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-700">Address</p>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
                                            <textarea
                                                required
                                                placeholder="Full business address..."
                                                value={formData.address}
                                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium min-h-[80px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-primary/30 active:scale-[0.98] disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    Create Business Profile
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center mt-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Step 1 of 1 • Complete profile
                    </p>
                </div>
            </div>
        </ProtectedRoute>
    );
}
