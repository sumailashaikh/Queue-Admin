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
    ExternalLink,
    Loader2,
    AlertCircle,
    ArrowLeft,
    User,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { businessService, Business } from "@/services/businessService";
import { queueService, QueueEntry } from "@/services/queueService";
import { appointmentService } from "@/services/appointmentService";

export default function CustomerJoinPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();

    const [business, setBusiness] = useState<(Business & { queues: any[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [activeView, setActiveView] = useState<'queue' | 'appointment'>('queue');
    const [step, setStep] = useState(1); // 1: Selection, 2: Details, 3: Success
    const [selectedServices, setSelectedServices] = useState<any[]>([]); // Array for multi-select
    const [bookingDate, setBookingDate] = useState("");
    const [bookingTime, setBookingTime] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticket, setTicket] = useState<QueueEntry | null>(null);
    const [isAppointmentMode, setIsAppointmentMode] = useState(false);

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

    const formatTime12 = (timeStr: string) => {
        if (!timeStr) return "";
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const isStoreOpen = () => {
        if (!business) return false;
        if (business.is_closed) return false;

        const now = new Date();
        const istTimeStr = now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const normalize = (t: string) => (t && t.length === 5) ? `${t}:00` : t;
        const open = normalize(business.open_time || '09:00:00');
        const close = normalize(business.close_time || '21:00:00');

        return istTimeStr >= open && istTimeStr <= close;
    };

    const isOpen = isStoreOpen();

    useEffect(() => {
        const loadBusiness = async () => {
            try {
                const data = await businessService.getBusinessBySlug(slug);
                setBusiness(data);
            } catch (err: any) {
                setError(err.message || "Failed to load business details");
            } finally {
                setLoading(false);
            }
        };
        loadBusiness();
    }, [slug]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const service_ids = selectedServices.map(s => s.id);

            if (activeView === 'queue') {
                const openQueue = business!.queues?.find(q => q.status === 'open');
                if (!openQueue) {
                    setError("No open queue available right now.");
                    return;
                }

                const entry = await queueService.joinQueue({
                    queue_id: openQueue.id,
                    customer_name: name,
                    phone: phone,
                    service_ids: service_ids // Send array
                });
                setTicket(entry);
            } else {
                if (selectedServices.length === 0 || !bookingDate || !bookingTime) return;
                const startTime = new Date(`${bookingDate}T${bookingTime}:00`);
                // Duration is already summed up in totalDuration

                await appointmentService.createAppointment({
                    business_id: business!.id,
                    service_ids: service_ids, // Send array
                    start_time: startTime.toISOString(),
                    status: 'pending'
                });
                // For simplified success message
                setTicket({ ticket_number: 'APT-REQD', position: 0 } as any);
                setIsAppointmentMode(true);
            }
            setStep(3);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Opening Doors...</p>
            </div>
        );
    }

    if (error || !business) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-20 w-20 bg-red-50 rounded-[32px] flex items-center justify-center text-red-500 mb-6">
                    <AlertCircle className="h-10 w-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">Door's Closed!</h1>
                <p className="text-slate-500 font-bold mb-8 max-w-xs mx-auto">
                    {error || "We couldn't find this business. Please check the link and try again."}
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs"
                >
                    <ArrowLeft className="h-4 w-4" /> Go Back Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-0 md:p-6 lg:p-12">
            <div className="w-full max-w-lg bg-white min-h-screen md:min-h-0 md:rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col">

                {/* Header Section */}
                <div className="p-8 pb-12 bg-slate-900 text-white space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center font-black text-xl">
                            {business.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border",
                            isOpen
                                ? "bg-emerald-500 text-white border-emerald-400"
                                : "bg-red-500 text-white border-red-400"
                        )}>
                            <div className={cn("h-1.5 w-1.5 rounded-full bg-white", isOpen && "animate-pulse")} />
                            {isOpen ? "Open Now" : "Currently Closed"}
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">{business.name}</h1>
                        <p className="text-slate-400 text-sm font-bold mt-1 line-clamp-1">
                            {business.address || "Digital Appointment Management"}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-8 -mt-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-1 flex">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "flex-1 h-1.5 rounded-full mx-0.5 transition-all duration-500",
                                    step >= s ? "bg-primary" : "bg-slate-100"
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8">
                    {/* View Switcher */}
                    {step < 3 && (
                        <>
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl mb-8">
                                <button
                                    onClick={() => { setActiveView('queue'); setStep(1); }}
                                    className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        activeView === 'queue' ? "bg-white text-primary shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    Join Queue
                                </button>
                                <button
                                    onClick={() => { setActiveView('appointment'); setStep(1); }}
                                    className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        activeView === 'appointment' ? "bg-white text-primary shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    Book Appointment
                                </button>
                            </div>

                            {!isOpen && (
                                <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-amber-900 uppercase tracking-widest">Business is Closed</p>
                                        <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                                            We are currently not accepting new queue entries or appointments.
                                            Our hours: <span className="text-amber-900">{formatTime12(business.open_time)} - {formatTime12(business.close_time)}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {step === 1 && activeView === 'queue' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 uppercase">What are you here for?</h2>
                                <p className="text-sm font-bold text-slate-400">Select all services you need</p>
                            </div>

                            <div className="space-y-3 pb-24 md:pb-0">
                                {(business as any).services?.map((s: any) => {
                                    const isSelected = selectedServices.some(item => item.id === s.id);
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => toggleService(s)}
                                            disabled={!isOpen}
                                            className={cn(
                                                "w-full p-6 rounded-[24px] border-2 text-left transition-all group flex items-center gap-4",
                                                isSelected
                                                    ? "bg-primary/5 border-primary shadow-lg shadow-primary/5"
                                                    : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                                isSelected ? "bg-primary text-white scale-110" : "bg-slate-50 text-slate-400"
                                            )}>
                                                {isSelected ? <CheckCircle2 className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900">{s.name}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <span>₹{s.price}</span>
                                                    <span>•</span>
                                                    <span>{s.duration_minutes} min</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedServices.length > 0 && (
                                <div className="fixed bottom-0 left-0 right-0 md:relative p-6 bg-white border-t border-slate-100 md:border-none md:p-0 md:mt-8 animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0">
                                    <div className="bg-slate-900 rounded-[28px] p-6 text-white shadow-2xl flex items-center justify-between gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Selection</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl font-black text-primary">₹{totalPrice}</span>
                                                <span className="text-slate-600">/</span>
                                                <span className="text-sm font-bold">{totalDuration} min</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setStep(2)}
                                            className="px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 1 && activeView === 'appointment' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 uppercase">When would you like to come?</h2>
                                <p className="text-sm font-bold text-slate-400">Choose services and schedule your visit</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Services</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(business as any).services?.map((s: any) => {
                                            const isSelected = selectedServices.some(item => item.id === s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => toggleService(s)}
                                                    className={cn(
                                                        "p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between",
                                                        isSelected ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                                                            isSelected ? "bg-primary border-primary text-white" : "border-slate-200"
                                                        )}>
                                                            {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                                        </div>
                                                        <span className="font-bold text-slate-900">{s.name}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-primary">₹{s.price}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedServices.length > 0 && (
                                        <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 rounded-xl mt-2 border border-slate-100">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Summary</p>
                                                <p className="text-sm font-bold text-slate-700">{totalDuration} min total duration</p>
                                            </div>
                                            <p className="text-lg font-black text-primary">₹{totalPrice}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date</label>
                                        <input
                                            type="date"
                                            value={bookingDate}
                                            onChange={(e) => setBookingDate(e.target.value)}
                                            className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold outline-none border-2 border-transparent focus:border-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Time</label>
                                        <input
                                            type="time"
                                            value={bookingTime}
                                            onChange={(e) => setBookingTime(e.target.value)}
                                            className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold outline-none border-2 border-transparent focus:border-primary/20"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!isOpen || selectedServices.length === 0 || !bookingDate || !bookingTime}
                                    className="w-full py-5 bg-primary text-white rounded-[20px] text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/10 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {!isOpen ? "Store Currently Closed" : "Continue to Details"}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="h-3 w-3" /> Change Service
                            </button>

                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 uppercase">Your Details</h2>
                                <p className="text-sm font-bold text-slate-400">We'll use this to notify you when it's your turn</p>
                            </div>

                            <form onSubmit={handleJoin} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                            <input
                                                required
                                                type="text"
                                                placeholder="Enter your name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white rounded-[20px] text-sm font-bold text-slate-900 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                            <input
                                                required
                                                type="tel"
                                                placeholder="Your phone number"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/10 focus:bg-white rounded-[20px] text-sm font-bold text-slate-900 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-primary hover:bg-primary-hover text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (activeView === 'queue' ? "Confirm Joining Queue" : "Request Appointment")}
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 3 && ticket && (
                        <div className="text-center space-y-8 animate-in zoom-in-95 duration-500 p-4">
                            <div className={cn(
                                "h-24 w-24 rounded-[40px] flex items-center justify-center mx-auto transform rotate-12 scale-110 mb-8",
                                isAppointmentMode ? "bg-indigo-50 text-indigo-600" : "bg-green-50 text-green-600"
                            )}>
                                {isAppointmentMode ? <Clock className="h-12 w-12" /> : <CheckCircle2 className="h-12 w-12" />}
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {isAppointmentMode ? "Request Sent!" : "You're in line!"}
                                </h2>
                                <p className="text-sm font-bold text-slate-400">
                                    {isAppointmentMode
                                        ? "Appointment request for "
                                        : "Your virtual ticket at "
                                    }
                                    <span className="text-slate-900">{business.name}</span>
                                </p>
                            </div>

                            <div className="bg-white border-2 border-slate-100 rounded-[32px] p-8 space-y-6 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                                {isAppointmentMode ? (
                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Services</p>
                                            <p className="text-xl font-black text-indigo-600 uppercase">{selectedServices.map(s => s.name).join(', ')}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Stay</p>
                                                <p className="text-lg font-black text-slate-900">~{totalDuration} min</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fee</p>
                                                <p className="text-lg font-black text-slate-900">₹{totalPrice}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue Ticket No.</p>
                                            <p className="text-5xl font-black text-primary tracking-tighter">{ticket.ticket_number}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Position</p>
                                                <p className="text-xl font-black text-slate-900">#{ticket.position}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Wait</p>
                                                <p className="text-xl font-black text-amber-500">~{totalDuration || 10}m</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-4 px-4">
                                <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                                    {isAppointmentMode
                                        ? "The owner will review your request and confirm via WhatsApp. Please keep your phone nearby."
                                        : "We'll notify you on WhatsApp when it's almost your turn. You don't need to stand in line!"
                                    }
                                </p>

                                {!isAppointmentMode && (
                                    <button
                                        onClick={() => {
                                            if (ticket?.token) {
                                                window.open(`/status?token=${ticket.token}`, '_blank');
                                            }
                                        }}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                                    >
                                        <ExternalLink className="h-4 w-4" /> View Live Status
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                                        const formatTime12 = (time: string) => {
                                            const [hours, minutes] = time.split(':');
                                            const d = new Date();
                                            d.setHours(parseInt(hours), parseInt(minutes));
                                            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                        };

                                        let text = "";
                                        const servicesList = selectedServices.map(s => s.name).join(', ');
                                        if (isAppointmentMode) {
                                            text = `Hello,\n\nI would like to request an appointment at ${business.name}.\n\nServices: ${servicesList}\nDate: ${formatDate(bookingDate)}\nTime: ${formatTime12(bookingTime)}\nName: ${name}\n\nThank you.`;
                                        } else {
                                            const statusLink = `${window.location.origin}/status?token=${ticket.token}`;
                                            text = `Hello,\n\nI have joined the live queue at ${business.name}.\n\nTicket Number: ${ticket.ticket_number}\nServices: ${servicesList}\nName: ${name}\n\nTrack my live status: ${statusLink}\n\nThank you.`;
                                        }

                                        // Use business whatsapp_number if available, fallback to phone
                                        let phoneStr = (business.whatsapp_number || business.phone || "").replace(/\D/g, '');
                                        if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;

                                        if (phoneStr) {
                                            window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`, '_blank');
                                        } else {
                                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                        }
                                    }}
                                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                    <Phone className="h-4 w-4" /> Message Business on WhatsApp
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Branding */}
                <div className="p-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                    Powered by QueueUp
                </div>
            </div>
        </div>
    );
}
