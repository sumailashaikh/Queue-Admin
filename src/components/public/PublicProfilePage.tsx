"use client";

import { useState, useEffect, useRef } from "react";
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
    Calendar,
    AlertCircle,
    ArrowLeft,
    User,
    Sparkles,
    ArrowRight,
    Globe,
    ShieldCheck,
    MessageSquare,
    QrCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { businessService, Business } from "@/services/businessService";
import { queueService, QueueEntry } from "@/services/queueService";
import { appointmentService } from "@/services/appointmentService";
import { formatGlobalPhone } from "@/lib/phoneUtils";
import { i18n } from "@/lib/i18n";
import { formatCurrency as globalFormatCurrency } from "@/lib/utils";

interface PublicProfilePageProps {
    slug: string;
}

export function PublicProfilePage({ slug }: PublicProfilePageProps) {
    const router = useRouter();

    const [business, setBusiness] = useState<(Business & { queues: any[], services: any[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [activeView, setActiveView] = useState<'queue' | 'appointment'>('queue');
    const [step, setStep] = useState(1); // 1: Selection, 2: Details, 3: Success
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
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

    const [customerLangOverride, setCustomerLangOverride] = useState<string | null>(null);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const langDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
                setLangDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const lang = customerLangOverride || 'en';
    const currency = business?.currency || 'USD';

    const formatCurrency = (amount: number) => {
        return globalFormatCurrency(amount, currency, lang);
    };

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
            timeZone: business.timezone || 'UTC',
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
                setError(i18n.t(lang, 'public.err_load_business'));
            } finally {
                setLoading(false);
            }
        };
        loadBusiness();
    }, [slug]);

    // Auto-select first available date logic
    useEffect(() => {
        if (activeView === 'appointment' && business && !bookingDate) {
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            const parseToMins = (t: string) => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };

            const timezone = business.timezone || 'UTC';

            const checkAvailability = (dateStr: string) => {
                const openMins = parseToMins(business.open_time || "09:00");
                const closeMins = parseToMins(business.close_time || "21:00");
                const bufferLimit = closeMins - 10;

                let startMins = openMins;
                if (dateStr === today) {
                    const now = new Date();
                    const istMins = now.toLocaleTimeString('en-GB', {
                        timeZone: timezone,
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit'
                    }).split(':').map(Number);
                    const currentMins = istMins[0] * 60 + istMins[1];
                    startMins = Math.max(openMins, currentMins + 15);
                    startMins = Math.ceil(startMins / 15) * 15;
                }

                return (startMins + totalDuration <= bufferLimit);
            };

            if (!checkAvailability(today)) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                setBookingDate(tomorrowStr);
            } else {
                setBookingDate(today);
            }
        }
    }, [activeView, business, totalDuration, bookingDate]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const service_ids = selectedServices.map(s => s.id);
            
            // Try to derive country code from business phone or default to IN
            let defaultCountry: any = 'IN';
            if (business?.phone?.startsWith('+')) {
                // If business phone has a +, libphonenumber might be able to infer it
                defaultCountry = undefined; 
            }
            
            const formattedPhone = formatGlobalPhone(phone, defaultCountry) || phone;

            if (activeView === 'queue') {
                const openQueue = business!.queues?.find(q => q.status === 'open');
                if (!openQueue) {
                    setError('ERR_NO_QUEUE');
                    return;
                }

                const entry = await queueService.joinQueue({
                    queue_id: openQueue.id,
                    customer_name: name,
                    phone: formattedPhone,
                    service_ids: service_ids,
                    ui_language: lang // Persist selected language
                });
                setTicket(entry);
            } else {
                if (selectedServices.length === 0 || !bookingDate || !bookingTime) return;
                const startTime = new Date(`${bookingDate}T${bookingTime}:00`);

                await appointmentService.bookPublicAppointment({
                    business_id: business!.id,
                    service_ids: service_ids,
                    start_time: startTime.toISOString(),
                    customer_name: name,
                    phone: formattedPhone,
                    ui_language: lang // Persist selected language
                });
                setTicket({ ticket_number: 'APT-REQD', position: 0 } as any);
                setIsAppointmentMode(true);
            }
            setStep(3);
        } catch (err: any) {
            setError(err.message || i18n.t(lang, 'public.err_something_went_wrong'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{i18n.t(lang, 'public.opening_doors')}</p>
            </div>
        );
    }

    if ((error && error !== 'ERR_NO_QUEUE' && error !== i18n.t(lang, 'public.no_queue')) || !business) {
        const isFullyBooked = error?.toLowerCase().includes('fully booked') || error?.toLowerCase().includes('closing time') || error?.toLowerCase().includes('tomorrow');

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className={cn(
                    "h-24 w-24 rounded-[40px] flex items-center justify-center mb-8 transform rotate-12 scale-110",
                    isFullyBooked ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
                )}>
                    <AlertCircle className="h-12 w-12" />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight max-w-sm mx-auto">
                    {isFullyBooked ? i18n.t(lang, 'public.fully_booked') : i18n.t(lang, 'public.door_closed')}
                </h1>

                <p className="text-slate-500 font-bold mb-10 max-w-sm mx-auto leading-relaxed text-sm">
                    {isFullyBooked
                        ? i18n.t(lang, 'public.fully_booked_desc')
                        : (error && error !== 'ERR_NO_QUEUE' && error !== i18n.t(lang, 'public.no_queue') ? error : i18n.t(lang, 'public.door_closed_desc'))
                    }
                </p>

                <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
                    {isFullyBooked && (
                        <button
                            onClick={() => {
                                setActiveView('appointment');
                                setStep(1);
                                setError(null);
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                setBookingDate(tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
                            }}
                            className="w-full py-3.5 bg-[#0B1B3F] hover:bg-[#142A5A] text-white rounded-xl text-xs font-semibold uppercase tracking-widest shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Calendar className="h-4 w-4" />
                            {i18n.t(lang, 'public.book_tomorrow')}
                        </button>
                    )}

                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center justify-center gap-2 text-slate-400 hover:text-primary font-bold uppercase tracking-wider text-xs transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> {i18n.t(lang, 'public.go_back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-0 md:p-6 lg:p-12">
            <div className="w-full max-w-lg bg-white min-h-screen md:min-h-0 md:rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col">

                {/* Header Section */}
                <div className="p-8 pb-12 bg-slate-900 text-white space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center font-bold text-xl">
                            {business.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative" ref={langDropdownRef}>
                                <button
                                    onClick={() => setLangDropdownOpen(open => !open)}
                                    className="h-8 w-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                >
                                    <Globe className="h-4 w-4" />
                                </button>
                                {langDropdownOpen && (
                                    <div className="absolute right-0 top-10 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] overflow-hidden">
                                        {['en', 'es', 'hi', 'ar'].map(l => (
                                            <button
                                                key={l}
                                                onClick={() => { setCustomerLangOverride(l); setLangDropdownOpen(false); }}
                                                className={cn("w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors", lang === l ? "text-primary bg-primary/5 border-l-4 border-primary" : "text-slate-600 hover:bg-slate-50")}
                                            >
                                                {l === 'en' ? 'English' : l === 'es' ? 'Español' : l === 'hi' ? 'हिंदी' : 'العربية'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={cn(
                                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border",
                                isOpen
                                    ? "bg-emerald-500 text-white border-emerald-400"
                                    : "bg-red-500 text-white border-red-400"
                            )}>
                                <div className={cn("h-1.5 w-1.5 rounded-full bg-white", isOpen && "animate-pulse")} />
                                {isOpen ? i18n.t(lang, 'public.open_now') : i18n.t(lang, 'public.currently_closed')}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight lowercase">{business.name}</h1>
                        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                            {business.address || i18n.t(lang, 'public.digital_management')}
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
                            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl mb-8">
                                <button
                                    onClick={() => { setActiveView('queue'); setStep(1); }}
                                    className={cn(
                                        "flex-1 py-3.5 text-xs font-bold tracking-wide rounded-xl transition-all border",
                                        activeView === 'queue' ? "bg-primary text-white border-primary shadow-md" : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-white hover:border-slate-200 hover:shadow-sm active:scale-[0.98]"
                                    )}
                                >
                                    {i18n.t(lang, 'public.join_queue')}
                                </button>
                                <button
                                    onClick={() => { setActiveView('appointment'); setStep(1); }}
                                    className={cn(
                                        "flex-1 py-3.5 text-xs font-bold tracking-wide rounded-xl transition-all border",
                                        activeView === 'appointment' ? "bg-primary text-white border-primary shadow-md" : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-white hover:border-slate-200 hover:shadow-sm active:scale-[0.98]"
                                    )}
                                >
                                    {i18n.t(lang, 'public.book_appointment')}
                                </button>
                            </div>

                            {activeView === 'queue' && (error === 'ERR_NO_QUEUE' || error === i18n.t(lang, 'public.no_queue')) && (
                                <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">{i18n.t(lang, 'public.no_queue')}</p>
                                    </div>
                                </div>
                            )}

                            {!isOpen && (
                                <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">{i18n.t(lang, 'public.business_closed')}</p>
                                        <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                                            {i18n.t(lang, 'public.closed_desc')}
                                            <br />
                                            {i18n.t(lang, 'public.our_hours')} <span className="text-amber-900">{formatTime12(business.open_time)} - {formatTime12(business.close_time)}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{i18n.t(lang, 'public.select_service')}</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{i18n.t(lang, 'public.select_service')}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-primary tracking-tighter">{formatCurrency(totalPrice)}</span>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{totalDuration} {i18n.t(lang, 'public.min')} total</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {business.services?.map((s: any) => {
                                    const isSelected = selectedServices.some(item => item.id === s.id);
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => toggleService(s)}
                                            disabled={!isOpen && activeView === 'queue'}
                                            className={cn(
                                                "w-full p-6 rounded-[28px] border-2 text-left transition-all duration-300 flex items-center gap-5 group relative overflow-hidden",
                                                isSelected
                                                    ? "bg-primary border-primary ring-4 ring-primary/30 text-white scale-[1.02] shadow-xl shadow-primary/20"
                                                    : "border-slate-50 bg-white hover:border-primary/20 hover:shadow-md shadow-sm",
                                                !isOpen && activeView === 'queue' && "opacity-60 grayscale-[0.5] cursor-not-allowed"
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
                                                    <span>{formatCurrency(s.price)}</span>
                                                    <span>•</span>
                                                    <span>{s.duration_minutes} {i18n.t(lang, 'public.min')}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {activeView === 'appointment' && (
                                <div className="space-y-6 pt-6 border-t border-slate-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date</label>
                                            <input
                                                type="date"
                                                min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
                                                value={bookingDate}
                                                onChange={(e) => setBookingDate(e.target.value)}
                                                className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Time</label>
                                            <select
                                                required
                                                value={bookingTime}
                                                onChange={(e) => setBookingTime(e.target.value)}
                                                className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold shadow-sm outline-none"
                                            >
                                                <option value="">{i18n.t(lang, 'public.select_time')}</option>
                                                {(() => {
                                                    const slots = [];
                                                    if (!business || !bookingDate) return null;
                                                    const parseToMins = (t: string) => {
                                                        const [h, m] = t.split(':').map(Number);
                                                        return h * 60 + m;
                                                    };
                                                    const openMins = parseToMins(business.open_time || "09:00");
                                                    const closeMins = parseToMins(business.close_time || "21:00");
                                                    const bufferLimit = closeMins - 10;
                                                    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                                                    let startMins = openMins;
                                                    if (bookingDate === today) {
                                                        const now = new Date();
                                                        const istMins = now.toLocaleTimeString('en-GB', {
                                                            timeZone: 'Asia/Kolkata',
                                                            hour12: false,
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }).split(':').map(Number);
                                                        const currentMins = istMins[0] * 60 + istMins[1];
                                                        startMins = Math.max(openMins, currentMins + 15);
                                                        startMins = Math.ceil(startMins / 15) * 15;
                                                    }
                                                    for (let m = startMins; m + totalDuration <= bufferLimit; m += 15) {
                                                        const h = Math.floor(m / 60);
                                                        const mins = m % 60;
                                                        const timeStr = `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                                                        slots.push(timeStr);
                                                    }
                                                    return slots.map(s => (
                                                        <option key={s} value={s}>{formatTime12(s)}</option>
                                                    ));
                                                })()}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedServices.length > 0 && (
                                <div className="fixed bottom-0 left-0 right-0 md:relative md:mt-auto p-6 bg-white border-t border-slate-100 md:border-none md:p-0 md:pt-4 animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0">
                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={(activeView === 'appointment' && !bookingTime) || (!isOpen && activeView === 'queue')}
                                        className="w-full h-16 bg-[#0B1B3F] hover:bg-[#142A5A] text-white rounded-xl text-[10px] font-semibold uppercase tracking-[0.2em] shadow-md active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                    >
                                        {(!isOpen && activeView === 'queue') ? i18n.t(lang, 'public.check_in_unavailable') : i18n.t(lang, 'public.continue')}
                                        {(isOpen || activeView === 'appointment') && <ArrowRight className="h-4 w-4" />}
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
                                <ArrowLeft className="h-3 w-3" /> {i18n.t(lang, 'public.change_selection')}
                            </button>

                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{i18n.t(lang, 'public.personal_details')}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{i18n.t(lang, 'public.provide_info')}</p>
                            </div>

                            <form onSubmit={handleJoin} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{i18n.t(lang, 'public.full_name')}</label>
                                        <div className="relative">
                                            <User className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                required
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full h-16 pl-14 pr-6 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-[24px] text-sm font-bold text-slate-900 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{i18n.t(lang, 'public.whatsapp')}</label>
                                        <div className="relative">
                                            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                required
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full h-16 pl-14 pr-6 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-[24px] text-sm font-bold text-slate-900 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-[#0B1B3F] hover:bg-[#142A5A] text-white rounded-xl text-[10px] font-semibold uppercase tracking-[0.2em] shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (activeView === 'queue' ? i18n.t(lang, 'public.confirm_queue') : i18n.t(lang, 'public.request_appt'))}
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 3 && ticket && (
                        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 py-4">
                            <div className="h-32 w-32 bg-primary rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 relative group overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {isAppointmentMode ? <Clock className="h-16 w-16 text-white" /> : <ShieldCheck className="h-16 w-16 text-white" />}
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {isAppointmentMode ? i18n.t(lang, 'public.request_sent') || "Request Sent!" : i18n.t(lang, 'public.check_in_successful') || "Check-in Successful!"}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                    {i18n.t(lang, 'public.welcome_to')} <span className="text-slate-900">{business.name}</span>.<br />
                                    {isAppointmentMode ? i18n.t(lang, 'public.appointment_request_for') || "Your appointment request has been sent." : i18n.t(lang, 'public.service_pass_generated') || "Your service pass has been generated."}
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 space-y-8 relative">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{i18n.t(lang, 'public.selected_services')}</p>
                                    <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                                        {selectedServices.map(s => s.name).join(' + ')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-slate-200">
                                    <div className="text-center space-y-1">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{isAppointmentMode ? i18n.t(lang, 'public.time_slot') || "Time Slot" : i18n.t(lang, 'public.est_duration') || "Est. Duration"}</p>
                                        <p className="text-lg font-black text-slate-900">
                                            {isAppointmentMode ? formatTime12(bookingTime) : `${totalDuration} ${i18n.t(lang, 'public.min')}`}
                                        </p>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{i18n.t(lang, 'public.est_fee') || "Est. Fee"}</p>
                                        <p className="text-lg font-black text-slate-900">{formatCurrency(totalPrice)}</p>
                                    </div>
                                </div>

                                {!isAppointmentMode && (
                                    <div className="pt-6 border-t border-slate-100 mt-6 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{i18n.t(lang, 'public.queue_position') || "Queue Position"}</p>
                                        <p className="text-6xl font-black text-primary tracking-tighter">Q-{ticket?.position || "..."}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 px-2">
                                <button
                                    onClick={() => {
                                        const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                                        let text = "";
                                        const servicesList = selectedServices.map(s => s.name).join(', ');

                                        const h = i18n.t(lang, 'public.wa_hello') || "Hello";
                                        const req_appt = i18n.t(lang, 'public.wa_req_appt') || "I would like to request an appointment at";
                                        const srv = i18n.t(lang, 'public.wa_services') || "Services:";
                                        const dt = i18n.t(lang, 'public.wa_date') || "Date:";
                                        const tm = i18n.t(lang, 'public.wa_time') || "Time:";
                                        const nm = i18n.t(lang, 'public.wa_name') || "Name:";
                                        const ty = i18n.t(lang, 'public.wa_thank_you') || "Thank you.";

                                        const jq = i18n.t(lang, 'public.wa_join_queue') || "I have joined the live queue at";
                                        const tk = i18n.t(lang, 'public.wa_ticket') || "Ticket Number:";
                                        const trk = i18n.t(lang, 'public.wa_track') || "Track my live status:";

                                        if (isAppointmentMode) {
                                            text = `${h}\n\n${req_appt} ${business.name}.\n\n${srv} ${servicesList}\n${dt} ${formatDate(bookingDate)}\n${tm} ${formatTime12(bookingTime)}\n${nm} ${name}\n\n${ty}`;
                                        } else {
                                            const statusLink = `${window.location.origin}/status?token=${ticket.token || ticket.status_token}`;
                                            text = `${h}\n\n${jq} ${business.name}.\n\n${tk} ${ticket.ticket_number}\n${srv} ${servicesList}\n${nm} ${name}\n\n${trk} ${statusLink}\n\n${ty}`;
                                        }
                                        let phoneStr = (business.whatsapp_number || business.phone || "").replace(/\D/g, '');
                                        if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;
                                        window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                    className="w-full h-16 bg-[#128c7e] hover:bg-[#075e54] text-white rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-500/10 active:scale-95"
                                >
                                    <MessageSquare className="h-5 w-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{i18n.t(lang, 'public.whatsapp_help') || "WhatsApp Help"}</span>
                                </button>

                                {!isAppointmentMode && (ticket?.token || ticket?.status_token) && (
                                    <button
                                        onClick={() => router.push(`/status?token=${ticket.token || ticket.status_token}&lang=${lang}`)}
                                        className="w-full h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
                                    >
                                        <QrCode className="h-5 w-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{i18n.t(lang, 'public.track_live_status') || "Track Live Status"}</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full h-16 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-sm mt-4 cursor-pointer font-black"
                                >
                                    <span className="text-[10px] uppercase tracking-[0.2em]">{i18n.t(lang, 'public.done') || "Done"}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Branding */}
                <div className="p-8 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.4em]">
                    {i18n.t(lang, 'public.powered_by')}
                </div>
            </div>
        </div >
    );
}
