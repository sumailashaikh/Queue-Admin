"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    Clock,
    ChevronRight,
    CheckCircle2,
    ArrowLeft,
    Loader2,
    AlertCircle,
    Phone,
    User
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
    const [selectedQueue, setSelectedQueue] = useState<any | null>(null);
    const [selectedService, setSelectedService] = useState<any | null>(null);
    const [bookingDate, setBookingDate] = useState("");
    const [bookingTime, setBookingTime] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticket, setTicket] = useState<QueueEntry | null>(null);
    const [isAppointmentMode, setIsAppointmentMode] = useState(false);

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
            if (activeView === 'queue') {
                if (!selectedQueue) return;
                const entry = await queueService.joinQueue({
                    queue_id: selectedQueue.id,
                    customer_name: name,
                    phone: phone,
                    service_name: selectedQueue.services?.name
                });
                setTicket(entry);
            } else {
                if (!selectedService || !bookingDate || !bookingTime) return;
                const duration = selectedService.duration_minutes || 30;
                const startTime = new Date(`${bookingDate}T${bookingTime}:00`);
                const endTime = new Date(startTime.getTime() + duration * 60000);

                await appointmentService.createAppointment({
                    business_id: business!.id,
                    service_id: selectedService.id,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'pending'
                });
                // For simplified success message, we can use a mock ticket or different state
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
                        <div className="px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Live Queue
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
                    )}

                    {step === 1 && activeView === 'queue' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 uppercase">What are you here for?</h2>
                                <p className="text-sm font-bold text-slate-400">Select a service to see the wait time</p>
                            </div>

                            <div className="space-y-3">
                                {business.queues?.map((q) => (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            setSelectedQueue(q);
                                            setStep(2);
                                        }}
                                        disabled={q.status !== 'open'}
                                        className={cn(
                                            "w-full p-6 rounded-[24px] border-2 text-left transition-all group flex items-center gap-4",
                                            q.status === 'open'
                                                ? "bg-white border-slate-100 hover:border-primary/20 hover:bg-slate-50/50 active:scale-[0.98]"
                                                : "bg-slate-50 border-transparent opacity-60 grayscale"
                                        )}
                                    >
                                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-slate-900 group-hover:text-primary transition-colors">{q.name}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {q.current_wait_time_minutes}m Wait / Person</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 1 && activeView === 'appointment' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 uppercase">When would you like to come?</h2>
                                <p className="text-sm font-bold text-slate-400">Choose a service and schedule your visit</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Service</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(business as any).services?.map((s: any) => (
                                            <button
                                                key={s.id}
                                                onClick={() => setSelectedService(s)}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between",
                                                    selectedService?.id === s.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                                                )}
                                            >
                                                <span className="font-bold text-slate-900">{s.name}</span>
                                                <span className="text-xs font-black text-primary">₹{s.price}</span>
                                            </button>
                                        ))}
                                    </div>
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
                                    disabled={!selectedService || !bookingDate || !bookingTime}
                                    className="w-full py-5 bg-primary text-white rounded-[20px] text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/10 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    Continue to Details
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
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Service</p>
                                            <p className="text-2xl font-black text-indigo-600 uppercase">{selectedService?.name}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                                <p className="text-lg font-black text-slate-900">{new Date(bookingDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                                                <p className="text-lg font-black text-slate-900">{bookingTime}</p>
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
                                                <p className="text-xl font-black text-amber-500">~{selectedQueue?.current_wait_time_minutes}m</p>
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

                                <button
                                    onClick={() => {
                                        const text = isAppointmentMode
                                            ? `Hello! I just requested an appointment for ${selectedService?.name} on ${bookingDate} at ${bookingTime}. My name is ${name}.`
                                            : `Hello! I just joined the queue at ${business.name}. My ticket is ${ticket.ticket_number}.`;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                    <Phone className="h-4 w-4" /> Message Salon on WhatsApp
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
