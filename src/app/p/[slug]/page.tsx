"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    Clock,
    ChevronRight,
    CheckCircle2,
    Phone,
    MessageCircle,
    ChevronLeft,
    Loader2,
    Calendar,
    AlertCircle,
    ArrowLeft,
    User,
    Sparkles,
    Star,
    ArrowRight,
    MapPin,
    ShieldCheck,
    Coffee,
    X,
    MessageSquare,
    QrCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/businessService";
import { queueService, QueueEntry } from "@/services/queueService";
import { appointmentService } from "@/services/appointmentService";
import { api } from "@/lib/api";

export default function CustomerJoinPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();

    const [business, setBusiness] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [activeView, setActiveView] = useState<'queue' | 'appointment'>('queue');
    const [step, setStep] = useState(1); // 1: Selection, 2: Details, 3: Pass
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [bookingDate, setBookingDate] = useState("");
    const [bookingTime, setBookingTime] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticket, setTicket] = useState<QueueEntry | null>(null);
    const [liveEntries, setLiveEntries] = useState<any[]>([]);
    const [avgServiceTime, setAvgServiceTime] = useState(15);
    const [businessStatus, setBusinessStatus] = useState<{ isOpen: boolean; message?: string }>({ isOpen: true });

    const toggleService = (service: any) => {
        const isSelected = selectedServices.find(s => s.id === service.id);
        if (isSelected) {
            setSelectedServices(selectedServices.filter(s => s.id !== service.id));
        } else {
            setSelectedServices([...selectedServices, service]);
        }
    };

    const totalDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    const totalPrice = selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);

    const checkBusinessStatus = (b: any) => {
        if (!b) return { isOpen: false };
        if (b.is_closed) return { isOpen: false, message: "The business is currently closed." };

        const now = new Date();
        const istTimeStr = now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });

        const open = b.open_time || '09:00';
        const close = b.close_time || '21:00';

        if (istTimeStr < open) return { isOpen: false, message: `Opens at ${open}` };
        if (istTimeStr > close) return { isOpen: false, message: "Closed for the day" };

        return { isOpen: true };
    };

    const isNearClosing = () => {
        if (!business) return false;
        const now = new Date();
        const istMins = now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        }).split(':').map(Number);
        const currentMins = istMins[0] * 60 + istMins[1];
        const [closeH, closeM] = (business.close_time || '21:00').split(':').map(Number);
        const closeMins = closeH * 60 + closeM;

        // Simple wait time calculation
        const waitingAhead = liveEntries.filter(e => e.status === 'waiting' || e.status === 'serving').length;
        const estimatedWait = waitingAhead * avgServiceTime;

        return (currentMins + estimatedWait + totalDuration > closeMins - 10);
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const { business: bData, entries } = (await businessService.getBusinessDisplayData(slug)) as any;
                setBusiness(bData);
                setLiveEntries(entries || []);
                setBusinessStatus(checkBusinessStatus(bData));

                if (bData.services?.length > 0) {
                    const avg = bData.services.reduce((acc: number, s: any) => acc + (s.duration_minutes || 0), 0) / bData.services.length;
                    setAvgServiceTime(Math.max(10, Math.round(avg)));
                }
            } catch (err: any) {
                setError(err.message || "Failed to load details");
            } finally {
                setLoading(false);
            }
        };
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [slug]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isNearClosing() && activeView === 'queue') {
            setError("We're closing soon. Please select a duration that fits or book for tomorrow.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const service_ids = selectedServices.map(s => s.id);
            if (activeView === 'queue') {
                const openQueue = business!.queues?.find((q: any) => q.status === 'open');
                if (!openQueue) throw new Error("No open queue available.");

                const entry = await queueService.joinQueue({
                    queue_id: openQueue.id,
                    customer_name: name,
                    phone: phone,
                    service_ids: service_ids,
                    entry_source: 'qr_walkin'
                });
                setTicket(entry);
            } else {
                if (!bookingDate || !bookingTime) throw new Error("Select date and time.");
                const startTime = new Date(`${bookingDate}T${bookingTime}:00`);
                await appointmentService.bookPublicAppointment({
                    business_id: business!.id,
                    service_ids: service_ids,
                    start_time: startTime.toISOString(),
                    customer_name: name,
                    phone: phone
                });
                setTicket({ ticket_number: 'BOOKED', position: 0 } as any);
            }
            setStep(3);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#1a237e] flex flex-col items-center justify-center p-6">
            <Loader2 className="h-10 w-10 animate-spin text-white opacity-50" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-0 md:p-6 lg:p-12">
            <div className="w-full max-w-lg bg-white min-h-screen md:min-h-0 md:rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col">

                {/* Header Section */}
                <div className="p-8 pb-12 bg-slate-900 text-white space-y-4 relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl border border-white/10 shadow-lg">
                            {business.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border shadow-lg",
                            businessStatus.isOpen
                                ? "bg-emerald-500 text-white border-emerald-400"
                                : "bg-red-500 text-white border-red-400"
                        )}>
                            <div className={cn("h-1.5 w-1.5 rounded-full bg-white", businessStatus.isOpen && "animate-pulse")} />
                            {businessStatus.isOpen ? "Open Now" : "Currently Closed"}
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold tracking-tight lowercase">{business.name}</h1>
                        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                            {business.address || "Digital Appointment Management"}
                        </p>
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Progress Bar */}
                <div className="px-8 -mt-6 relative z-20">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-1 flex">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "flex-1 h-1.5 rounded-full mx-0.5 transition-all duration-500",
                                    step >= s ? "bg-indigo-600" : "bg-slate-100"
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-8 flex flex-col">
                    {/* View Switcher */}
                    {step < 3 && (
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl mb-8 border border-slate-100">
                            <button
                                onClick={() => { setActiveView('queue'); setStep(1); }}
                                className={cn(
                                    "flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all",
                                    activeView === 'queue' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                                )}
                            >
                                Join Queue
                            </button>
                            <button
                                onClick={() => { setActiveView('appointment'); setStep(1); }}
                                className={cn(
                                    "flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all",
                                    activeView === 'appointment' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                                )}
                            >
                                Book Appointment
                            </button>
                        </div>
                    )}

                    {!businessStatus.isOpen && step < 3 && (
                        <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Business is Closed</p>
                                <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                                    We are currently not accepting new entries.<br />
                                    Our hours: {business.open_time} - {business.close_time}
                                </p>
                            </div>
                        </div>
                    )}

                    {error && step < 3 && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center gap-3 animate-in shake-in duration-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    {/* Step Based Content */}
                    <div className="flex-1 flex flex-col">
                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Step 1: Services</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select all services you need</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-indigo-600 tracking-tighter">₹{totalPrice}</span>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{totalDuration}m total</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {business.services?.map((s: any) => {
                                        const isSelected = selectedServices.some(item => item.id === s.id);
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => toggleService(s)}
                                                className={cn(
                                                    "w-full p-6 rounded-[28px] border-2 text-left transition-all duration-300 flex items-center gap-5 group relative overflow-hidden",
                                                    isSelected
                                                        ? "bg-slate-900 border-slate-900 text-white scale-[1.02] shadow-xl shadow-slate-200"
                                                        : "border-slate-50 bg-white hover:border-slate-200 shadow-sm"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                    isSelected ? "bg-white/10" : "bg-slate-50 text-slate-300 group-hover:bg-slate-100"
                                                )}>
                                                    {isSelected ? <CheckCircle2 className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                                                </div>
                                                <div className="flex-1 relative z-10">
                                                    <h3 className={cn("font-bold text-sm tracking-tight", isSelected ? "text-white" : "text-slate-800")}>{s.name}</h3>
                                                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                                        <span>₹{s.price}</span>
                                                        <span>•</span>
                                                        <span>{s.duration_minutes} min</span>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedServices.length > 0 && (
                                    <div className="fixed bottom-0 left-0 right-0 md:relative md:mt-auto p-6 bg-white border-t border-slate-100 md:border-none md:p-0 md:pt-4 animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="w-full h-16 bg-indigo-600 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            Continue to Details
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                                >
                                    <ArrowLeft className="h-3 w-3" /> Change Services
                                </button>

                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Step 2: Your Details</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provide info to secure your spot</p>
                                </div>

                                <form onSubmit={handleJoin} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Enter your name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600/10 focus:bg-white rounded-[24px] text-sm font-bold text-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    required
                                                    type="tel"
                                                    placeholder="10-digit number"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600/10 focus:bg-white rounded-[24px] text-sm font-bold text-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        {activeView === 'appointment' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                                    <input
                                                        required
                                                        type="date"
                                                        value={bookingDate}
                                                        onChange={(e) => setBookingDate(e.target.value)}
                                                        min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
                                                        className="w-full h-16 px-6 bg-slate-50 border-transparent rounded-[24px] text-xs font-bold text-slate-900 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                                                    <input
                                                        required
                                                        type="time"
                                                        value={bookingTime}
                                                        onChange={(e) => setBookingTime(e.target.value)}
                                                        className="w-full h-16 px-6 bg-slate-50 border-transparent rounded-[24px] text-xs font-bold text-slate-900 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-20 bg-indigo-600 hover:bg-black text-white rounded-[32px] text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : (activeView === 'queue' ? "Complete Check-in" : "Request Appointment")}
                                    </button>
                                </form>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 py-4">
                                <div className="h-32 w-32 bg-indigo-600 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/20 relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {activeView === 'appointment' ? <Clock className="h-16 w-16 text-white" /> : <ShieldCheck className="h-16 w-16 text-white" />}
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                                        {activeView === 'appointment' ? "Request Sent!" : "Check-in Successful!"}
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                        Welcome to <span className="text-slate-900">{business.name}</span>.<br />
                                        Your service pass has been generated.
                                    </p>
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 space-y-8 relative">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Services</p>
                                        <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                                            {selectedServices.map(s => s.name).join(' + ')}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-slate-200">
                                        <div className="text-center space-y-1">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Est. Duration</p>
                                            <p className="text-lg font-black text-slate-900">{totalDuration}m</p>
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Est. Fee</p>
                                            <p className="text-lg font-black text-slate-900">₹{totalPrice}</p>
                                        </div>
                                    </div>

                                    {activeView === 'queue' && (
                                        <div className="pt-6 border-t border-slate-100 mt-6">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue Position</p>
                                            <p className="text-6xl font-black text-indigo-600 tracking-tighter">Q-{ticket?.position || "..."}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 px-2">
                                    <button
                                        onClick={() => {
                                            const msg = encodeURIComponent(`Hi ${business.name}, I just ${activeView === 'appointment' ? 'requested an appointment' : 'joined the queue'}. Name: ${name}`);
                                            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                        }}
                                        className="w-full h-16 bg-[#128c7e] hover:bg-black text-white rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-500/10 active:scale-95"
                                    >
                                        <MessageSquare className="h-5 w-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp Help</span>
                                    </button>

                                    {activeView === 'queue' && ticket?.id && (
                                        <button
                                            onClick={() => router.push(`/status?token=${ticket.id}`)}
                                            className="w-full h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
                                        >
                                            <QrCode className="h-5 w-5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Track Live Status</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => window.location.reload()}
                                        className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="py-10 text-center bg-slate-50/30">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Powered by QueueUp</p>
                </div>
            </div>
        </div>
    );
}
