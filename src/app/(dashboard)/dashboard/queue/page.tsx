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
    Check,
    Phone,
    Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { queueService, QueueEntry, Queue } from "@/services/queueService";
import { businessService } from "@/services/businessService";
import { supabase } from "@/lib/supabase";

export default function LiveQueuePage() {
    const { business } = useAuth();
    const [queues, setQueues] = useState<Queue[]>([]);
    const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
    const [entries, setEntries] = useState<QueueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Management State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, queueId: "", queueName: "" });
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isQueueDropdownOpen, setIsQueueDropdownOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        current_wait_time_minutes: 0,
        status: 'open' as 'open' | 'closed'
    });

    const fetchQueues = useCallback(async () => {
        try {
            const data = await queueService.getMyQueues();
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
    }, []);

    const fetchEntries = useCallback(async () => {
        if (!selectedQueue?.id) return;
        setEntriesLoading(true);
        try {
            const data = await queueService.getQueueEntriesToday(selectedQueue.id);
            setEntries(data);
        } catch (error) {
            console.error("Failed to fetch queue entries:", error);
        } finally {
            setEntriesLoading(false);
        }
    }, [selectedQueue?.id]);

    useEffect(() => {
        console.log("Mounting LiveQueuePage - fetching initial data");
        fetchQueues();
    }, []); // Run only once on mount

    useEffect(() => {
        if (selectedQueue?.id) {
            fetchEntries();
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
                    fetchEntries();
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
            ).filter((item: QueueEntry) => item.status !== 'completed' && item.status !== 'cancelled'));
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            // Force re-render to update "Xm ago" timers
            setEntries(prev => [...prev]);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleCopyLink = () => {
        if (!business) return;
        const link = `${window.location.origin}/${business.slug}`;
        navigator.clipboard.writeText(link);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleCreateQueue = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await queueService.createQueue(formData);
            await fetchQueues();
            setIsAddModalOpen(false);
            setFormData({ name: "", description: "", current_wait_time_minutes: 0, status: 'open' });
        } catch (err: any) {
            setError(err.message || "Failed to create queue");
        } finally {
            setIsSubmitting(false);
        }
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
        } catch (err: any) {
            setError(err.message || "Failed to update queue");
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
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete queue. It might have active entries.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleResetQueue = async () => {
        if (!selectedQueue) return;
        setIsDeleting(true);
        try {
            await queueService.resetQueueEntries(selectedQueue.id);
            await fetchEntries();
            setIsResetModalOpen(false);
        } catch (err) {
            console.error("Reset failed:", err);
            alert("Failed to reset queue.");
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

    const filteredEntries = entries.filter(item =>
        item.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.phone && item.phone.includes(search))
    );

    const getWaitTimeDisplay = (timeString: string) => {
        if (!timeString) return "--";
        try {
            const joined = new Date(timeString).getTime();
            const now = new Date().getTime();
            const diffInMinutes = Math.floor((now - joined) / (1000 * 60));

            if (diffInMinutes < 1) return "Just now";
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            const hours = Math.floor(diffInMinutes / 60);
            const mins = diffInMinutes % 60;
            return `${hours}h ${mins}m ago`;
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
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Initializing Queues...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        Live Queue
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setIsQueueDropdownOpen(!isQueueDropdownOpen)}
                                className="group flex items-center gap-3 px-4 py-2 bg-white border-2 border-slate-100 rounded-2xl text-primary text-sm font-black hover:border-primary/20 hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <Layout className="h-4 w-4" />
                                {selectedQueue?.name || "Select Queue"}
                                <ChevronDown className={cn("h-4 w-4 opacity-40 transition-transform", isQueueDropdownOpen && "rotate-180")} />
                            </button>

                            {isQueueDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsQueueDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 mt-3 w-64 bg-white border border-slate-200 rounded-[24px] shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 duration-200">
                                        <div className="p-2 space-y-1">
                                            {queues.map(q => (
                                                <button
                                                    key={q.id}
                                                    onClick={() => {
                                                        setSelectedQueue(q);
                                                        setIsQueueDropdownOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-all",
                                                        selectedQueue?.id === q.id
                                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    )}
                                                >
                                                    {q.name}
                                                </button>
                                            ))}
                                            <div className="pt-2 mt-2 border-t border-slate-100 px-2 pb-1">
                                                <button
                                                    onClick={() => {
                                                        setFormData({ name: "", description: "", current_wait_time_minutes: 0, status: 'open' });
                                                        setIsAddModalOpen(true);
                                                        setIsQueueDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    CREATE NEW QUEUE
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {business && (
                            <button
                                onClick={handleCopyLink}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black transition-all border-2",
                                    isCopied
                                        ? "bg-green-500 border-green-500 text-white"
                                        : "bg-white border-slate-100 text-slate-600 hover:border-primary/20 hover:text-primary shadow-sm"
                                )}
                            >
                                {isCopied ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="h-4 w-4" />
                                        Share Join Link
                                    </>
                                )}
                            </button>
                        )}

                        {selectedQueue && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={openEditModal}
                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                    title="Queue Settings"
                                >
                                    <Settings2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ isOpen: true, queueId: selectedQueue.id, queueName: selectedQueue.name })}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="Delete Queue"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setIsResetModalOpen(true)}
                                    className="px-3 py-2 text-primary hover:bg-primary/5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-primary/10"
                                    title="Clear Today's Entries"
                                >
                                    Reset Today
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search active customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 pr-6 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all w-72 shadow-sm placeholder:text-slate-400 placeholder:font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Queue Summary Bar */}
            {selectedQueue && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-[24px] border-2 border-slate-50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Visitors</p>
                            <p className="text-xl font-black text-slate-900">{entries.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border-2 border-slate-50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Wait Time</p>
                            <p className="text-xl font-black text-slate-900">
                                {(entries.filter(e => e.status === 'waiting').length * (selectedQueue.current_wait_time_minutes || 0))} min
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] border-2 border-slate-50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                            <IndianRupee className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Revenue</p>
                            <p className="text-xl font-black text-slate-900">
                                ₹{(entries.length * (selectedQueue.services?.price || 0)).toLocaleString()}
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
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                            <p className="text-xl font-black text-slate-900 uppercase">{selectedQueue.status}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div className="pro-card p-0 overflow-hidden bg-white border-2 border-slate-50">
                <div className="overflow-x-auto min-h-[400px]">
                    {entriesLoading ? (
                        <div className="flex flex-col items-center justify-center p-24 space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Syncing Live Data...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor Info</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Details</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Life Cycle</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waiting Time</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                                <div className="h-20 w-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300">
                                                    <Users className="h-10 w-10" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-lg font-black text-slate-900">Quiet in here!</p>
                                                    <p className="text-sm font-bold text-slate-400 leading-relaxed">
                                                        {selectedQueue
                                                            ? "Everything is clear. No active customers are currently waiting in this queue."
                                                            : "Please select or create a queue to start managing your visitors live."}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEntries.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center text-xs font-black text-primary group-hover:border-primary/20 transition-all">
                                                        {item.position}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{item.customer_name || 'Anonymous'}</p>
                                                        <div className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1.5 uppercase tracking-tighter">
                                                            <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                            {item.phone || 'No phone'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="inline-flex items-center px-3 py-1 bg-slate-100/50 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-tight">
                                                    {item.service_name || 'Standard Service'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={cn(
                                                    "inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm",
                                                    item.status === 'serving'
                                                        ? "bg-green-500 text-white"
                                                        : "bg-amber-400 text-white"
                                                )}>
                                                    {item.status === 'serving' ? 'IN SERVICE' : 'WAITING'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-slate-900">
                                                    <Clock className="h-3.5 w-3.5 opacity-30" />
                                                    <span className="text-xs font-black" title={`Joined at ${formatTime(item.joined_at)}`}>
                                                        {item.status === 'serving' ? `Started ${getWaitTimeDisplay(item.served_at || item.joined_at)}` : getWaitTimeDisplay(item.joined_at)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {item.phone && (
                                                        <button
                                                            onClick={() => {
                                                                const msg = `Hello ${item.customer_name}! This is ${business?.name}. It's almost your turn! Please come to the counter.`;
                                                                window.open(`https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                                            }}
                                                            className="h-10 w-10 flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-all border border-green-200 shadow-sm"
                                                            title="Notify on WhatsApp"
                                                        >
                                                            <Phone className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {item.status === 'waiting' ? (
                                                        <button
                                                            onClick={() => handleUpdateStatus(item.id, 'serving')}
                                                            className="h-10 px-6 bg-primary hover:bg-primary-hover text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95"
                                                        >
                                                            SERVE
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUpdateStatus(item.id, 'completed')}
                                                            className="h-10 px-6 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-green-500/20 hover:-translate-y-0.5 active:scale-95"
                                                        >
                                                            FINISH
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modals & Dialogs */}
            <ManagementModal
                isOpen={isAddModalOpen || isEditModalOpen}
                onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                onSubmit={isAddModalOpen ? handleCreateQueue : handleUpdateQueue}
                formData={formData}
                setFormData={setFormData}
                isSubmitting={isSubmitting}
                error={error}
                mode={isAddModalOpen ? 'create' : 'edit'}
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
        </div>
    );
}

const ManagementModal = ({ isOpen, onClose, onSubmit, formData, setFormData, isSubmitting, error, mode }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50">
                <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                {mode === 'create' ? 'Create New Queue' : 'Queue Settings'}
                            </h2>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                {mode === 'create' ? 'Define a new visitor flow' : 'Update queue configuration'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <X className="h-6 w-6 text-slate-400" />
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
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Queue Identity</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g., General Inquiries, Technical Support"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Description (Optional)</label>
                            <textarea
                                rows={2}
                                placeholder="What is this queue for?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Avg. Time / Person</label>
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
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Daily Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all appearance-none"
                                >
                                    <option value="open">ACTIVE / OPEN</option>
                                    <option value="closed">CLOSED</option>
                                    <option value="paused">PAUSED</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-5 bg-primary hover:bg-primary-hover text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                mode === 'create' ? 'Initialize Queue' : 'Save Configuration'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const DeleteDialog = ({ isOpen, onClose, onConfirm, queueName, isDeleting }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50">
                <div className="p-10 text-center space-y-8">
                    <div className="h-24 w-24 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto text-red-600 transition-transform hover:scale-110 duration-500">
                        <Trash2 className="h-12 w-12" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-slate-900">Delete Queue?</h3>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed px-2">
                            Are you sure you want to remove <span className="text-slate-900">{queueName}</span>? All history for this queue will be archived.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            disabled={isDeleting}
                            onClick={onConfirm}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/10 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "CONFIRM DELETE"}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
const ResetDialog = ({ isOpen, onClose, onConfirm, isDeleting }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50">
                <div className="p-8 text-center space-y-6">
                    <div className="h-20 w-20 bg-amber-50 rounded-[32px] flex items-center justify-center text-amber-500 mx-auto">
                        <AlertCircle className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight text-slate-900">Clear Today's Queue?</h2>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed px-4">
                            This will remove ALL customers who joined today. This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 h-14 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                        >
                            KEEP ENTRIES
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 h-14 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "YES, CLEAR"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
