"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Loader2, MessageCircle, QrCode, Receipt, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { useBusinessCurrency } from "@/hooks/useBusinessCurrency";
import { queueService, QueueEntry } from "@/services/queueService";
import { paymentSettingsService, PaymentSettings } from "@/services/paymentSettingsService";

type BillEntry = QueueEntry & { queue_name: string };
type PaymentMethod = "qr" | "cash";

export default function PaymentsPage() {
    const { business } = useAuth();
    const { t } = useLanguage();
    const { format } = useBusinessCurrency(business?.currency);
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<BillEntry[]>([]);
    const [selectedEntryId, setSelectedEntryId] = useState<string>("");
    const [updatingPayment, setUpdatingPayment] = useState<"qr" | "cash" | null>(null);
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
    const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
    const tr = (key: string, fallback: string) => {
        const translated = t(key);
        return translated === key ? fallback : translated;
    };
    const normalizeServiceName = (name?: string | null) => {
        const raw = String(name || "").trim();
        if (!raw) return tr("payments.service_fallback", "Service");
        return raw
            .split(/\s+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const flattened = (await queueService.getBillingEntriesToday())
                    .filter((entry) => ["completed", "serving", "waiting"].includes(String(entry.status || "").toLowerCase()))
                    .sort((a, b) => new Date(b.joined_at || "").getTime() - new Date(a.joined_at || "").getTime());

                setEntries(flattened);
                if (flattened.length > 0) setSelectedEntryId(flattened[0].id);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    useEffect(() => {
        const loadPaymentSettings = async () => {
            if (!business?.id) return;
            setPaymentSettingsLoading(true);
            try {
                const settings = await paymentSettingsService.getByBusinessId(business.id);
                setPaymentSettings(settings);
            } catch {
                setPaymentSettings(null);
            } finally {
                setPaymentSettingsLoading(false);
            }
        };
        loadPaymentSettings();
    }, [business?.id]);

    const selectedEntry = useMemo(
        () => entries.find((e) => e.id === selectedEntryId) || null,
        [entries, selectedEntryId]
    );

    const lineItems = useMemo(() => {
        if (!selectedEntry) return [];
        if (selectedEntry.queue_entry_services && selectedEntry.queue_entry_services.length > 0) {
            return selectedEntry.queue_entry_services.map((s) => ({
                name: normalizeServiceName(s.services?.name),
                amount: Number(s.price || 0),
                duration: Number(s.duration_minutes || 0)
            }));
        }
        return [{
            name: normalizeServiceName(selectedEntry.service_name),
            amount: Number(selectedEntry.total_price || 0),
            duration: Number(selectedEntry.total_duration_minutes || 0)
        }];
    }, [selectedEntry, t]);

    const totalAmount = useMemo(
        () => lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        [lineItems]
    );

    const invoiceNumber = useMemo(() => {
        if (!selectedEntry) return "";
        return `INV-${String(selectedEntry.ticket_number || selectedEntry.id).replace(/\s+/g, "").toUpperCase()}`;
    }, [selectedEntry]);

    const paymentQrPayload = useMemo(() => {
        if (!selectedEntry || !business) return "";
        const fallbackPayload = [
            "QUEUEUP_PAYMENT",
            `Business:${business.name}`,
            `Invoice:${invoiceNumber}`,
            `Customer:${selectedEntry.customer_name || "Guest"}`,
            `Amount:${totalAmount.toFixed(2)}`,
            `Currency:${business.currency || "INR"}`
        ].join("|");

        const businessPhone = String(business.whatsapp_number || business.phone || "").replace(/[^\d]/g, "");
        if ((business.currency || "INR") === "INR" && businessPhone) {
            return `upi://pay?pn=${encodeURIComponent(business.name)}&tn=${encodeURIComponent(invoiceNumber)}&am=${totalAmount.toFixed(2)}&cu=INR`;
        }
        return fallbackPayload;
    }, [selectedEntry, business, invoiceNumber, totalAmount]);

    const getInvoiceFileName = () => `${invoiceNumber || "invoice"}.pdf`;

    const buildInvoicePdf = () => {
        if (!selectedEntry || !business) return;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = 24;

        // Outer invoice card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 4, 4, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 4, 4);

        const wrappedAddress = doc.splitTextToSize(String(business.address || "-"), 74);
        const headerHeight = Math.max(38, 30 + wrappedAddress.length * 5);
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(14, y - 12, pageWidth - 28, headerHeight, 3, 3, "F");
        doc.setFillColor(59, 130, 246);
        doc.rect(14, y - 12 + headerHeight - 2, pageWidth - 28, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text("INVOICE", 20, y + 2);
        doc.setFontSize(12);
        doc.text(String(business.name || "Business"), pageWidth - 20, y, { align: "right" });
        doc.setFontSize(8.5);
        doc.text(wrappedAddress, pageWidth - 20, y + 6, { align: "right" });
        doc.setFontSize(9);
        doc.text("Business Billing Copy", pageWidth - 20, y + 12 + wrappedAddress.length * 5, { align: "right" });

        y += headerHeight - 6;

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(10.5);
        doc.text(`Invoice No: ${invoiceNumber}`, 16, y);
        doc.text(`Date: ${new Date().toLocaleString()}`, pageWidth - 16, y, { align: "right" });
        y += 10;

        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, y - 3, pageWidth - 28, 30, 2, 2, "FD");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("Bill To", 18, y + 3);
        doc.text("Payment", pageWidth - 60, y + 3);
        doc.setFontSize(11.5);
        doc.setTextColor(15, 23, 42);
        doc.text(String(selectedEntry.customer_name || "Guest"), 18, y + 10);
        doc.setFontSize(10);
        doc.text(`Phone: ${selectedEntry.phone || "-"}`, 18, y + 17);
        doc.text(`Ticket: ${selectedEntry.ticket_number || "-"}`, 18, y + 24);
        const paymentLabel = String(selectedEntry.payment_method || "unpaid").toUpperCase();
        doc.setTextColor(paymentLabel === "UNPAID" ? 220 : 16, paymentLabel === "UNPAID" ? 38 : 185, paymentLabel === "UNPAID" ? 38 : 129);
        doc.text(paymentLabel, pageWidth - 60, y + 11);
        doc.setTextColor(15, 23, 42);
        y += 38;

        // Table header like your reference design.
        doc.setFillColor(30, 41, 59);
        doc.rect(14, y - 4, pageWidth - 28, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text("ITEM", 18, y + 1);
        doc.text("PRICE", 118, y + 1);
        doc.text("QTY", 148, y + 1);
        doc.text("TOTAL", pageWidth - 18, y + 1, { align: "right" });
        y += 8;

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        lineItems.forEach((item, index) => {
            const rowTop = y - 4.5;
            if (index % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(14, rowTop, pageWidth - 28, 8, "F");
            }
            doc.text(item.name, 18, y);
            doc.text(format(item.amount), 118, y);
            doc.text("1", 148, y);
            doc.text(format(item.amount), pageWidth - 18, y, { align: "right" });
            y += 8;
        });

        y += 6;
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(14, y - 5, pageWidth - 28, 10, 2, 2, "F");
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text("Total", 18, y + 2);
        doc.text(format(totalAmount), pageWidth - 18, y + 2, { align: "right" });

        y += 14;
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Thank you for your visit. Generated by QueueUp Payment Desk.", 18, y);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 22, pageWidth - 14, pageHeight - 22);
        doc.setFontSize(8);
        doc.text("This is a computer-generated invoice and does not require signature.", 18, pageHeight - 15);

        return doc;
    };

    const downloadInvoicePdf = () => {
        const doc = buildInvoicePdf();
        if (!doc) return;
        doc.save(getInvoiceFileName());
    };

    const shareInvoiceOnWhatsApp = async () => {
        if (!selectedEntry || !business) return;
        const normalizedCustomerPhone = String(selectedEntry.phone || "").replace(/[^\d]/g, "");
        const doc = buildInvoicePdf();
        if (!doc) return;

        // Try to share the real PDF file first (works on supported devices/apps).
        const pdfBlob = doc.output("blob");
        const pdfFile = new File([pdfBlob], getInvoiceFileName(), { type: "application/pdf" });
        const canNativeShareFile =
            typeof navigator !== "undefined" &&
            typeof navigator.share === "function" &&
            typeof navigator.canShare === "function" &&
            navigator.canShare({ files: [pdfFile] });

        if (canNativeShareFile) {
            await navigator.share({
                files: [pdfFile],
                title: `${business.name} Invoice`,
                text: `Invoice ${invoiceNumber} for ${selectedEntry.customer_name || "Customer"}`
            });
            return;
        }

        // Fallback for browsers where direct PDF share to WhatsApp is not supported.
        doc.save(getInvoiceFileName());

        const lineSummary = lineItems.map((item, idx) => `${idx + 1}. ${item.name} - ${format(item.amount)}`).join("\n");

        const message = [
            `*${business.name || "Business"}*`,
            "*E-BILL INVOICE*",
            "",
            `Invoice: ${invoiceNumber}`,
            `Customer: ${selectedEntry.customer_name || "Guest"}`,
            `Ticket: ${selectedEntry.ticket_number || "-"}`,
            "",
            "*Services:*",
            lineSummary,
            "",
            `*Total: ${format(totalAmount)}*`,
            "",
            "Invoice PDF was downloaded. Please attach this PDF in WhatsApp and send."
        ].join("\n");

        const encodedText = encodeURIComponent(message);
        const shareUrl = normalizedCustomerPhone
            ? `https://wa.me/${normalizedCustomerPhone}?text=${encodedText}`
            : `https://wa.me/?text=${encodedText}`;
        window.open(shareUrl, "_blank");
        window.alert(tr("payments.whatsapp_attach_hint", "WhatsApp Web cannot auto-attach PDF in most desktop browsers. PDF is downloaded; please attach it in the WhatsApp chat."));
    };

    const markPayment = async (method: PaymentMethod) => {
        if (!selectedEntry) return;
        const existingMethod = String(selectedEntry.payment_method || "").toLowerCase();
        const isAlreadyPaid = existingMethod === "qr" || existingMethod === "cash";
        if (isAlreadyPaid && existingMethod !== method) {
            window.alert(`${tr("payments.already_paid_via", "Already marked paid via")} ${existingMethod.toUpperCase()}. ${tr("payments.payment_mode_locked", "Payment mode is locked.")}`);
            return;
        }
        try {
            setUpdatingPayment(method);
            await queueService.updatePayment(selectedEntry.id, method);
            setEntries((prev) =>
                prev.map((entry) =>
                    entry.id === selectedEntry.id ? { ...entry, payment_method: method } : entry
                )
            );
        } finally {
            setUpdatingPayment(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const currentPaymentMethod = String(selectedEntry?.payment_method || "").toLowerCase();
    const isPaidLocked = currentPaymentMethod === "qr" || currentPaymentMethod === "cash";

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Receipt className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{tr("payments.title", "Payment Desk")}</h1>
                    <p className="text-sm font-semibold text-slate-500">{tr("payments.subtitle", "Scan QR, collect payment, and share e-bill invoice.")}</p>
                </div>
            </div>

            {entries.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <p className="text-slate-500 font-semibold">{tr("payments.no_entries", "No billable customer entries found for today.")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{tr("payments.customer_bills", "Customer Bills")}</p>
                        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                            {entries.map((entry) => (
                                <button
                                    key={entry.id}
                                    onClick={() => setSelectedEntryId(entry.id)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-2xl border transition-all",
                                        selectedEntryId === entry.id
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-slate-50 border-slate-200 hover:bg-white"
                                    )}
                                >
                                    <p className="text-sm font-bold">{entry.customer_name || tr("payments.guest", "Guest")}</p>
                                    <p className={cn("text-[10px] font-black uppercase tracking-widest mt-1", selectedEntryId === entry.id ? "text-slate-300" : "text-slate-500")}>
                                        {entry.ticket_number}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                        {!selectedEntry ? null : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tr("payments.customer_details", "Customer Details")}</p>
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                                                <UserRound className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{selectedEntry.customer_name || tr("payments.guest", "Guest")}</p>
                                                <p className="text-xs font-semibold text-slate-500">{selectedEntry.phone || "-"}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-500 mt-3">{tr("payments.invoice", "Invoice")}: {invoiceNumber}</p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center justify-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{tr("payments.scan_to_pay", "Scan To Pay")}</p>
                                        <div className="rounded-xl bg-white border border-slate-200 p-3">
                                            {paymentSettingsLoading ? (
                                                <div className="h-[150px] w-[150px] flex items-center justify-center">
                                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                                </div>
                                            ) : paymentSettings?.qr_code_url ? (
                                                <img
                                                    src={paymentSettings.qr_code_url}
                                                    alt="Business payment QR"
                                                    className="h-[150px] w-[150px] object-contain"
                                                />
                                            ) : (
                                                <QRCodeSVG value={paymentQrPayload || "QUEUEUP_PAYMENT"} size={150} />
                                            )}
                                        </div>
                                        {paymentSettings?.upi_id && (
                                            <p className="text-[11px] font-semibold text-slate-500 mt-1">{paymentSettings.upi_id}</p>
                                        )}
                                        {!paymentSettingsLoading && !paymentSettings?.upi_id && (
                                            <div className="mt-1 flex flex-col items-center gap-1.5">
                                                <p className="text-[11px] font-semibold text-amber-600 text-center">
                                                    {tr("payments.no_payment_setup", "No payment QR setup. Add UPI in Settings.")}
                                                </p>
                                                <Link
                                                    href="/dashboard/settings"
                                                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 underline underline-offset-2"
                                                >
                                                    {tr("payments.go_to_payment_settings", "Go to Payment Settings")}
                                                </Link>
                                            </div>
                                        )}
                                        <p className="text-[11px] font-semibold text-slate-500 mt-2">{format(totalAmount)}</p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{tr("payments.customer_billing_details", "Customer Billing Details")}</p>
                                        <button
                                            onClick={downloadInvoicePdf}
                                            title={tr("payments.download_invoice", "Download invoice bill")}
                                            aria-label={tr("payments.download_invoice", "Download invoice bill")}
                                            className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-400 w-52">{tr("payments.customer_name", "Customer Name")}</td>
                                                    <td className="px-4 py-2 font-semibold text-slate-800">{selectedEntry.customer_name || tr("payments.guest", "Guest")}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-400">{tr("payments.phone", "Phone")}</td>
                                                    <td className="px-4 py-2 font-semibold text-slate-800">{selectedEntry.phone || "-"}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-400">{tr("payments.ticket", "Ticket")}</td>
                                                    <td className="px-4 py-2 font-semibold text-slate-800">{selectedEntry.ticket_number || "-"}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-400">{tr("payments.invoice", "Invoice")}</td>
                                                    <td className="px-4 py-2 font-semibold text-slate-800">{invoiceNumber}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-400">{tr("payments.payment_method", "Payment Method")}</td>
                                                    <td className="px-4 py-2 font-semibold text-slate-800 uppercase">{selectedEntry.payment_method || "unpaid"}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-400">{tr("payments.amount", "Amount")}</td>
                                                    <td className="px-4 py-2 font-bold text-slate-900">{format(totalAmount)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{tr("payments.service_details", "Service Details")}</p>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {lineItems.map((item, idx) => (
                                            <div key={`${item.name}-${idx}`} className="px-4 py-4 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-base font-bold text-slate-900">{item.name}</p>
                                                    <p className="text-sm font-semibold text-slate-500">{item.duration} min</p>
                                                </div>
                                                <p className="text-base font-bold text-slate-900">{format(item.amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                                        <p className="text-sm font-black uppercase tracking-widest">{tr("payments.total", "Total")}</p>
                                        <p className="text-xl font-black">{format(totalAmount)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={shareInvoiceOnWhatsApp}
                                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-600 active:scale-[0.99] transition-all shadow-sm hover:shadow cursor-pointer"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        {tr("payments.share_whatsapp", "Share On WhatsApp")}
                                    </button>
                                    <button
                                        onClick={() => markPayment("qr")}
                                        disabled={updatingPayment !== null || (isPaidLocked && currentPaymentMethod !== "qr")}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm",
                                            updatingPayment !== null || (isPaidLocked && currentPaymentMethod !== "qr")
                                                ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                                                : currentPaymentMethod === "qr"
                                                    ? "border border-sky-300 bg-sky-600 text-white cursor-default"
                                                    : "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300 active:scale-[0.99] cursor-pointer"
                                        )}
                                    >
                                        {updatingPayment === "qr" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                                        {currentPaymentMethod === "qr" ? tr("payments.paid_via_qr", "Paid via QR") : tr("payments.mark_qr_paid", "Mark QR Paid")}
                                    </button>
                                    <button
                                        onClick={() => markPayment("cash")}
                                        disabled={updatingPayment !== null || (isPaidLocked && currentPaymentMethod !== "cash")}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm",
                                            updatingPayment !== null || (isPaidLocked && currentPaymentMethod !== "cash")
                                                ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                                                : currentPaymentMethod === "cash"
                                                    ? "border border-emerald-300 bg-emerald-600 text-white cursor-default"
                                                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 active:scale-[0.99] cursor-pointer"
                                        )}
                                    >
                                        {updatingPayment === "cash" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                                        {currentPaymentMethod === "cash" ? tr("payments.paid_in_cash", "Paid in Cash") : tr("payments.mark_cash_paid", "Mark Cash Paid")}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

