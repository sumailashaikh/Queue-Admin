"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Trash2 as TrashIcon,
    Clock,
    Tag,
    Loader2,
    X,
    AlertCircle,
    LayoutGrid,
    Search,
    Sparkles,
    Settings2,
    ShieldCheck
} from "lucide-react";
import { serviceService, Service } from "@/services/serviceService";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// Custom Delete Dialog
function DeleteDialog({ isOpen, onClose, onConfirm, serviceName, isDeleting }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    serviceName: string;
    isDeleting: boolean;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50">
                <div className="p-8 text-center space-y-6">
                    <div className="h-20 w-20 bg-red-50 rounded-[28px] flex items-center justify-center mx-auto text-red-600 transition-transform hover:scale-110 duration-500">
                        <TrashIcon className="h-10 w-10" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-xl font-bold text-slate-900">Delete Service?</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Are you sure you want to remove <span className="text-slate-900 font-semibold">{serviceName}</span>? This action is permanent.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            disabled={isDeleting}
                            onClick={onConfirm}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-500/10 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delete"}
                        </button>
                        <button
                            disabled={isDeleting}
                            onClick={onClose}
                            className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ServicesPage() {
    const { business } = useAuth();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; serviceId: string; serviceName: string }>({
        isOpen: false,
        serviceId: "",
        serviceName: ""
    });
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [newService, setNewService] = useState({
        name: "",
        description: "",
        duration_minutes: 30,
        price: 0
    });

    const fetchServices = useCallback(async () => {
        try {
            const data = await serviceService.getMyServices();
            setServices(data || []);
        } catch (err) {
            console.error("Failed to fetch services:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business?.id) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await serviceService.createService({
                ...newService,
                business_id: business.id
            });
            await fetchServices();
            setIsAddModalOpen(false);
            setNewService({ name: "", description: "", duration_minutes: 30, price: 0 });
        } catch (err: any) {
            setError(err.message || "Failed to add service");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal.serviceId) return;

        setIsDeleting(true);
        try {
            await serviceService.deleteService(deleteModal.serviceId);
            setServices(prev => prev.filter(s => s.id !== deleteModal.serviceId));
            setDeleteModal({ isOpen: false, serviceId: "", serviceName: "" });
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete service. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <Sparkles className="h-4 w-4 text-primary/80 absolute -bottom-1 -right-1 animate-pulse" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Offerings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-sky-50 rounded-full border border-sky-100">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black text-sky-700 uppercase tracking-widest">Business Offerings Management</span>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
                            Our <span className="text-primary italic">Services</span>
                        </h1>
                        <p className="text-sm font-bold text-slate-500 max-w-xl leading-relaxed">
                            Define your unique value. Manage professional pricing and time-slots for your clients.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group w-full sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a service..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl text-sm font-semibold transition-all shadow-xl shadow-primary/10 hover:-translate-y-0.5 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        New Service
                    </button>
                </div>
            </div>

            {/* Grid Section */}
            {filteredServices.length === 0 ? (
                <div className="pro-card py-32 text-center space-y-8 bg-white/50 backdrop-blur-sm">
                    <div className="h-28 w-28 bg-slate-100 rounded-[40px] flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                        <LayoutGrid className="h-12 w-12 text-slate-300" />
                    </div>
                    <div className="space-y-3">
                        <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">Empty Workspace</p>
                        <p className="text-sm font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
                            No services match your search. Start fresh by creating a new offering.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className="group relative pro-card p-6 overflow-hidden border-2 hover:border-primary/20"
                        >

                            <div className="relative space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="h-10 w-10 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: true, serviceId: service.id, serviceName: service.name })}
                                        className="p-2 text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        title="Delete Service"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-base font-bold text-slate-900 transition-colors tracking-tight leading-tight">
                                        {service.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                        {service.description || "Professional service tailored to your requirements."}
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{service.duration_minutes} min</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 opacity-60">Base Price</span>
                                        <span className="text-xl font-bold text-slate-900 tracking-tight">₹{service.price}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <DeleteDialog
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                serviceName={deleteModal.serviceName}
                isDeleting={isDeleting}
            />

            {/* Add Service Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-slate-900">New Service</h2>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Configure Service Parameters</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddService} className="p-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-semibold animate-in slide-in-from-top-4">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Service Name</label>
                                <input
                                    required
                                    type="text"
                                    value={newService.name}
                                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="e.g. Premium Haircut"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Brief Description</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={newService.description}
                                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-sm text-slate-900 outline-none transition-all resize-none placeholder:text-slate-400"
                                    placeholder="Describe your service..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Duration (Min)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            required
                                            type="number"
                                            value={newService.duration_minutes || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setNewService({ ...newService, duration_minutes: val === "" ? 0 : parseInt(val) });
                                            }}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-sm text-slate-900 outline-none transition-all"
                                            placeholder="30"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Price (₹)</label>
                                    <div className="relative">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            required
                                            type="number"
                                            value={newService.price || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setNewService({ ...newService, price: val === "" ? 0 : parseInt(val) });
                                            }}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-sm text-slate-900 outline-none transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    disabled={isSubmitting}
                                    type="submit"
                                    className="w-full py-4 bg-primary hover:bg-primary-hover disabled:bg-indigo-300 text-white rounded-xl text-sm font-bold transition-all shadow-xl shadow-primary/10 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Sparkles className="h-5 w-5" />
                                            Activate Service
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
