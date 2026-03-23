"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    Store,
    Search,
    Shield,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Loader2,
    Calendar,
    Phone,
    ArrowUpDown,
    Filter,
    UserPlus,
    ShieldCheck,
    IndianRupee,
    Clock,
    Download,
    TrendingUp
} from "lucide-react";
import { adminService, DashboardUser, DashboardBusiness } from "@/services/adminService";
import { cn, formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, Globe } from "lucide-react";

const REGIONS = [
    { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳', phoneLimit: 10 },
    { code: 'AE', dial: '+971', name: 'UAE', flag: '🇦🇪', phoneLimit: 9 },
    { code: 'SA', dial: '+966', name: 'Saudi Arabia', flag: '🇸🇦', phoneLimit: 9 },
    { code: 'US', dial: '+1', name: 'USA', flag: '🇺🇸', phoneLimit: 10 },
    { code: 'GB', dial: '+44', name: 'UK', flag: '🇬🇧', phoneLimit: 10 },
];

export default function AdminDashboard() {
    const { t: baseT, language } = useLanguage();
    const t = (key: string, params?: any) => baseT(key, params, 'en');
    const { user, business } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'businesses'>('businesses');
    const [users, setUsers] = useState<DashboardUser[]>([]);
    const [businesses, setBusinesses] = useState<DashboardBusiness[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ page: 1, total: 0 });
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [globalStats, setGlobalStats] = useState<any>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Invite Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [invitePhone, setInvitePhone] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

    // Inspect Modal
    const [inspectedBusiness, setInspectedBusiness] = useState<DashboardBusiness | null>(null);
    const [businessDetails, setBusinessDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Create User Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createUserData, setCreateUserData] = useState({ full_name: "", phone: "", role: "owner" });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Region States
    const [selectedRegionInvite, setSelectedRegionInvite] = useState(REGIONS[0]);
    const [selectedRegionCreate, setSelectedRegionCreate] = useState(REGIONS[0]);
    const [isRegionDropdownOpenInvite, setIsRegionDropdownOpenInvite] = useState(false);
    const [isRegionDropdownOpenCreate, setIsRegionDropdownOpenCreate] = useState(false);

    const formatPhoneForSubmit = (phone: string, dial: string) => {
        const cleaned = phone.replace(/\D/g, '');
        return `${dial}${cleaned}`;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const stats = await adminService.getGlobalStats();
            setGlobalStats(stats);
            setLastUpdated(new Date());
            if (activeTab === 'users') {
                const res = await adminService.getAllUsers({
                    search,
                    page: pagination.page,
                    status: statusFilter || undefined
                });
                setUsers(res.data);
                if (res.pagination) {
                    setPagination(prev => ({ ...prev, total: res.pagination.total }));
                }
            } else {
                const data = await adminService.getAllBusinesses();
                setBusinesses(data);
            }
        } catch (err) {
            console.error("Failed to fetch admin data:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, search, pagination.page, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingRole(userId);
        try {
            await adminService.updateUserRole(userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
            alert(t('admin.role_update_success'));
        } catch (err) {
            alert(t('admin.role_update_fail'));
        } finally {
            setUpdatingRole(null);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: string, isVerified?: boolean) => {
        setLoading(true);
        try {
            await adminService.updateUserStatus(userId, newStatus, isVerified);
            setUsers(prev => prev.map(u => u.id === userId ? {
                ...u,
                status: newStatus as any,
                is_verified: isVerified ?? u.is_verified
            } : u));
            alert(t('admin.status_update_success'));
        } catch (err) {
            alert(t('admin.status_update_fail'));
        } finally {
            setLoading(false);
        }
    };

    const handleInviteAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        setInviteError(null);
        setInviteSuccess(null);
        try {
            const formattedPhone = formatPhoneForSubmit(invitePhone, selectedRegionInvite.dial);
            await adminService.inviteAdmin(formattedPhone);
            setInviteSuccess(t('admin.invite_modal.success', { phone: formattedPhone }));
            setInvitePhone("");
            fetchData();
        } catch (err: any) {
            setInviteError(err.response?.data?.message || t('admin.invite_modal.err_fail'));
        } finally {
            setInviteLoading(false);
        }
    };

    const handleInspect = async (business: DashboardBusiness) => {
        setInspectedBusiness(business);
        setDetailsLoading(true);
        try {
            const res = await adminService.getBusinessDetails(business.id);
            setBusinessDetails(res);
        } catch (err) {
            console.error("Failed to fetch business details:", err);
            alert(t('admin.inspect_modal.fetch_fail'));
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError(null);
        try {
            const formattedPhone = formatPhoneForSubmit(createUserData.phone, selectedRegionCreate.dial);
            await adminService.createUser({ ...createUserData, phone: formattedPhone });
            setIsCreateModalOpen(false);
            setCreateUserData({ full_name: "", phone: "", role: "owner" });
            fetchData();
        } catch (err: any) {
            setCreateError(err.response?.data?.message || t('admin.create_modal.err_fail'));
        } finally {
            setCreateLoading(false);
        }
    };

    const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20 animate-in fade-in duration-1000">
            {/* Reports Coming Soon Modal */}
            {isReportsModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsReportsModalOpen(false)}>
                    <div className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-slate-100/50 text-center space-y-6 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <div className="h-20 w-20 bg-indigo-50 rounded-[32px] flex items-center justify-center text-indigo-600 mx-auto">
                            <TrendingUp className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900">{t('admin.analytics_modal.title')}</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                {t('admin.analytics_modal.desc')}
                            </p>
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={() => setIsReportsModalOpen(false)}
                                className="w-full h-14 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                            >
                                {t('admin.analytics_modal.cta')}
                            </button>
                        </div>
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.2em]">{t('admin.analytics_modal.coming_soon')}</p>
                    </div>
                </div>
            )}
            {/* Verification Alert Banner */}
            {globalStats?.pendingVerifications > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-700 shadow-xl shadow-amber-200/20">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 bg-amber-500 rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-amber-200">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-amber-900 leading-tight">
                                {globalStats.pendingVerifications} New Businesses Pending Verification
                            </h3>
                            <p className="text-amber-700/70 text-sm font-medium">
                                Review and approve business owners to grant access to their portals.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setActiveTab('businesses');
                            setStatusFilter('pending');
                            // Scroll to table
                            document.getElementById('admin-table')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-amber-200 flex items-center gap-2 group whitespace-nowrap"
                    >
                        Review Now
                        <ArrowUpDown className="h-4 w-4 rotate-90 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">{t('admin.title')}</h1>
                        </div>
                        {lastUpdated && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">
                                Last Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        )}
                    </div>
                    <p className="text-slate-500 font-medium text-sm">{t('admin.desc')}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Hiding individual create/invite buttons per user request to simplify console 
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xl shadow-indigo-200 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        {t('admin.invite_admin')}
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xl shadow-slate-200/50 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        {t('admin.create_user')}
                    </button>
                    */}

                    <div className="flex items-center p-1 bg-slate-100 rounded-[20px] border border-slate-200/50">
                        {/* 
                        <button
                            onClick={() => setActiveTab('users')}
                            className={cn(
                                "px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-[16px] transition-all duration-300 flex items-center gap-2",
                                activeTab === 'users' ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10 scale-105" : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            <Users className="h-4 w-4" />
                            {t('admin.users_tab')}
                        </button>
                        */}
                        <button
                            onClick={() => setActiveTab('businesses')}
                            className={cn(
                                "px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-[16px] transition-all duration-300 flex items-center gap-2 relative",
                                activeTab === 'businesses' ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10 scale-105" : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            <Store className="h-4 w-4" />
                            {t('admin.businesses_tab')}
                            {globalStats?.pendingVerifications > 0 && (
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: t('admin.total_users'), value: globalStats?.totalUsers?.toLocaleString() || '...', icon: Users, color: 'blue' },
                    { label: t('admin.active_businesses'), value: globalStats?.activeBusinesses?.toLocaleString() || '...', icon: Store, color: 'indigo' },
                    { label: t('admin.platform_health'), value: globalStats?.platformHealth || '99.9%', icon: Shield, color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-[32px] p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                        <div className="flex items-center justify-between">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50 text-${stat.color}-600`)}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.global_scope')}</span>
                        </div>
                        <div className="mt-6 space-y-1">
                            <p className="text-4xl font-bold text-slate-900 tracking-tighter">{stat.value}</p>
                            <p className="text-xs font-bold text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div id="admin-table" className="bg-white border border-slate-100 rounded-[40px] shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full group">
                        <Search className="absolute left-4.5 top-1/2 -translate-y-[48%] h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder={t('admin.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-13 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[20px] text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setStatusFilter(statusFilter === 'pending' ? null : 'pending');
                                setPagination(p => ({ ...p, page: 1 }));
                            }}
                            className={cn(
                                "h-14 px-6 border rounded-[20px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all",
                                statusFilter === 'pending'
                                    ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                                    : "border-slate-100 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Filter className="h-4 w-4" />
                            {statusFilter === 'pending' ? t('admin.showing_pending') : t('admin.filter_pending')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600/20" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">{t('admin.syncing')}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.identity')}</th>
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.role')}</th>
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.phone')}</th>
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.joined')}</th>
                                        <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">{t('admin.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {activeTab === 'users' ? users.map((user) => (
                                        <tr key={user.id} className="group hover:bg-indigo-50/10 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">
                                                        {user.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <p className="font-bold text-slate-900 tracking-tight">{user.full_name || t('admin.incognito')}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <select
                                                        disabled={updatingRole === user.id}
                                                        value={user.role}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border-0 ring-1 ring-inset outline-none focus:ring-2",
                                                            user.role === 'admin' ? "bg-indigo-50 text-indigo-700 ring-indigo-200" :
                                                                user.role === 'owner' ? "bg-blue-50 text-blue-700 ring-blue-200" :
                                                                    "bg-slate-50 text-slate-500 ring-slate-200"
                                                        )}
                                                    >
                                                        <option value="customer">{t('admin.customer')}</option>
                                                        <option value="owner">{t('admin.owner')}</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    <div className={cn(
                                                        "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-tighter w-fit text-center",
                                                        user.status === 'active' ? "bg-emerald-50 text-emerald-600" :
                                                            user.status === 'blocked' ? "bg-red-50 text-red-600" :
                                                                "bg-amber-50 text-amber-600"
                                                    )}>
                                                        {user.status}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-xs font-bold text-slate-600">{user.phone}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col text-xs">
                                                    <p className="font-bold text-slate-900">{new Date(user.created_at).toLocaleDateString()}</p>
                                                    <p className="text-slate-400 font-bold uppercase">{new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 text-right">
                                                    {!user.is_verified && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'active', true)}
                                                            className="h-8 px-3 bg-emerald-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all flex items-center gap-1"
                                                        >
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {t('admin.verify')}
                                                        </button>
                                                    )}
                                                    {user.status !== 'blocked' && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'blocked')}
                                                            className="h-8 px-3 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-1"
                                                        >
                                                            <XCircle className="h-3 w-3" />
                                                            {t('admin.block')}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : businesses.map((business) => (
                                        <tr key={business.id} className="group hover:bg-blue-50/10 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-slate-900 tracking-tight text-base">{business.name}</p>
                                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">/{business.slug}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    {business.owner?.status === 'active' ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    ) : business.owner?.status === 'blocked' ? (
                                                        <XCircle className="h-4 w-4 text-red-500" />
                                                    ) : (
                                                        <Clock className="h-4 w-4 text-amber-500" />
                                                    )}
                                                    <span className={cn(
                                                        "text-xs font-bold uppercase tracking-wider",
                                                        business.owner?.status === 'active' ? "text-emerald-600" :
                                                            business.owner?.status === 'blocked' ? "text-red-600" :
                                                                "text-amber-600"
                                                    )}>
                                                        {business.owner?.status || 'Pending'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-slate-900">{business.owner?.full_name}</p>
                                                    <p className="text-xs font-bold text-slate-400">{business.owner?.phone}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-xs font-bold text-slate-600">{new Date(business.created_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 text-right">
                                                    {!business.owner?.is_verified && business.owner?.id && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await adminService.updateUserStatus(business.owner.id, 'active', true);
                                                                    alert("Owner verified successfully");
                                                                    fetchData(); // Re-fetch data to update business list
                                                                } catch (error) {
                                                                    alert("Failed to verify owner.");
                                                                }
                                                            }}
                                                            className="h-8 px-3 bg-emerald-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all flex items-center gap-1"
                                                        >
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {t('admin.verify_owner')}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleInspect(business)}
                                                        className="h-10 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-600 transition-all"
                                                    >
                                                        {t('admin.inspect')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {activeTab === 'users' && pagination.total > 0 && (
                            <div className="p-8 border-t border-slate-50 flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {t('admin.showing_users', { start: (pagination.page - 1) * 20 + 1, end: Math.min(pagination.page * 20, pagination.total), total: pagination.total })}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        disabled={pagination.page === 1}
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        className="h-12 w-12 flex items-center justify-center border border-slate-100 rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900"
                                    >
                                        <ArrowUpDown className="h-4 w-4 rotate-90" />
                                    </button>
                                    <button
                                        disabled={pagination.page * 20 >= pagination.total}
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        className="h-12 w-12 flex items-center justify-center border border-slate-100 rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900"
                                    >
                                        <ArrowUpDown className="h-4 w-4 -rotate-90" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Invite Admin Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 flex flex-col items-center text-center space-y-8">
                            <div className="flex items-center justify-between w-full mb-2">
                                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('admin.invite_modal.title')}</h3>
                                <button
                                    onClick={() => {
                                        setIsInviteModalOpen(false);
                                        setInviteError(null);
                                        setInviteSuccess(null);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <XCircle className="h-6 w-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="h-20 w-20 bg-indigo-50 rounded-[32px] flex items-center justify-center mx-auto text-indigo-600 transition-transform hover:scale-110 duration-500">
                                <ShieldCheck className="h-10 w-10" />
                            </div>

                            <div className="space-y-2 text-center">
                                <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-[250px] mx-auto">
                                    {t('admin.invite_modal.desc')}
                                </p>
                            </div>

                            {inviteError && (
                                <div className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold uppercase tracking-wider animate-in shake-1">
                                    {inviteError}
                                </div>
                            )}

                            {inviteSuccess && (
                                <div className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold uppercase tracking-wider text-center">
                                    {inviteSuccess}
                                </div>
                            )}

                            <form onSubmit={handleInviteAdmin} className="w-full space-y-6">
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 block text-left">Phone Number</label>
                                    <div className="flex gap-2">
                                        {/* Country Selector */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsRegionDropdownOpenInvite(!isRegionDropdownOpenInvite)}
                                                className="h-14 px-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2 hover:bg-slate-100 transition-all min-w-[100px]"
                                            >
                                                <span className="text-xl">{selectedRegionInvite.flag}</span>
                                                <span className="text-sm font-bold text-slate-700">{selectedRegionInvite.dial}</span>
                                                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isRegionDropdownOpenInvite && "rotate-180")} />
                                            </button>

                                            {isRegionDropdownOpenInvite && (
                                                <div className="absolute top-full left-0 mt-2 w-[240px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="p-2 space-y-1">
                                                        {REGIONS.map((region) => (
                                                            <button
                                                                key={region.code}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedRegionInvite(region);
                                                                    setIsRegionDropdownOpenInvite(false);
                                                                    setInvitePhone("");
                                                                }}
                                                                className={cn(
                                                                    "w-full px-4 py-3 rounded-xl flex items-center justify-between text-left hover:bg-indigo-50 transition-colors group",
                                                                    selectedRegionInvite.code === region.code && "bg-indigo-50"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xl">{region.flag}</span>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-900">{region.name}</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold">{region.dial}</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-black text-indigo-500 opacity-0 group-hover:opacity-100">{region.code}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative flex-1 group">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                required
                                                type="tel"
                                                maxLength={selectedRegionInvite.phoneLimit}
                                                placeholder={`${selectedRegionInvite.phoneLimit} digits`}
                                                value={invitePhone}
                                                onChange={(e) => setInvitePhone(e.target.value.replace(/\D/g, '').slice(0, selectedRegionInvite.phoneLimit))}
                                                className="w-full pl-12 pr-6 h-14 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 ml-1">Example: {selectedRegionInvite.dial} 123456789</p>
                                </div>

                                <div className="p-5 bg-indigo-50/50 rounded-[28px] border border-indigo-100/50 flex gap-4 text-left">
                                    <Globe className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Helpful Tip</p>
                                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                                            Admins must have a registered profile. Ask the person to login to the app once using OTP before you invite them.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    disabled={inviteLoading || invitePhone.length < selectedRegionInvite.phoneLimit}
                                    type="submit"
                                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-200"
                                >
                                    {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.invite_modal.confirm')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Inspect Business Modal */}
            {inspectedBusiness && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between w-full">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{inspectedBusiness.name}</h3>
                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em]">{t('admin.inspect_modal.title')}</p>
                                </div>
                                <button
                                    onClick={() => setInspectedBusiness(null)}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <XCircle className="h-6 w-6 text-slate-400" />
                                </button>
                            </div>

                            {detailsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600/20" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.inspect_modal.fetching')}</p>
                                </div>
                            ) : businessDetails ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: t('admin.inspect_modal.rev'), value: formatCurrency(businessDetails.totalRevenue, business?.currency, language), icon: IndianRupee, color: 'emerald', desc: 'Total expected earnings from services today' },
                                            { label: t('admin.inspect_modal.visits'), value: businessDetails.totalCustomers, icon: Users, color: 'blue', desc: 'Total walk-ins and bookings today' },
                                            { label: t('admin.inspect_modal.completed'), value: businessDetails.completedVisits, icon: CheckCircle2, color: 'indigo', desc: 'Successfully served customers' },
                                            { label: t('admin.inspect_modal.wait'), value: `${businessDetails.avgWaitTimeMinutes}m`, icon: Clock, color: 'amber', desc: 'Average time spent in waiting state' },
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group/stat relative transition-all hover:bg-white hover:shadow-lg">
                                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                    {stat.label}
                                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" title={stat.desc} />
                                                </p>
                                                <p className="text-xl font-bold text-slate-900 tracking-tighter">{stat.value}</p>
                                                <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover/stat:opacity-100 pointer-events-none transition-opacity flex items-end p-2">
                                                    <p className="text-[7px] font-bold text-indigo-500 uppercase tracking-tighter leading-none bg-indigo-50 px-2 py-1 rounded-md">{stat.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {businessDetails.recentActivity && businessDetails.recentActivity.length > 0 && (
                                        <div className="space-y-4">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">{t('admin.inspect_modal.activity_log')}</p>
                                            <div className="bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden">
                                                <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                                    {businessDetails.recentActivity.map((act: any) => (
                                                        <div key={act.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-white transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "h-10 px-3 min-w-[40px] w-auto rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest",
                                                                    act.type === 'appointment' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                                                                )}>
                                                                    {act.token}
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <p className="text-sm font-bold text-slate-900">{act.name}</p>
                                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{act.service}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right space-y-0.5">
                                                                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{act.status}</p>
                                                                <p className="text-xs font-medium text-slate-400">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-wider">{t('admin.inspect_modal.no_data')}</p>
                            )}

                            <div className="flex w-full">
                                <button
                                    onClick={() => window.open(`/${inspectedBusiness.slug}`, '_blank')}
                                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] text-xs font-bold uppercase tracking-[0.2em] transition-all"
                                >
                                    {t('admin.inspect_modal.view_public')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between w-full">
                                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('admin.create_modal.title')}</h3>
                                <button
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setCreateError(null);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <XCircle className="h-6 w-6 text-slate-400" />
                                </button>
                            </div>

                            {createError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold uppercase tracking-wider animate-in shake-1 leading-relaxed">
                                    {createError}
                                </div>
                            )}

                            <div className="p-5 bg-indigo-50/50 rounded-[28px] border border-indigo-100/50 flex gap-4">
                                <ShieldCheck className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Registration Notice</p>
                                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                                        For security, new users must initialize their account by logging in via Mobile OTP first. After their first login, they will appear here for role management.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">{t('admin.create_modal.full_name')}</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Enter name"
                                        value={createUserData.full_name}
                                        onChange={(e) => setCreateUserData(prev => ({ ...prev, full_name: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">{t('admin.create_modal.phone')}</label>
                                    <div className="flex gap-2">
                                        {/* Country Selector */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsRegionDropdownOpenCreate(!isRegionDropdownOpenCreate)}
                                                className="h-14 px-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2 hover:bg-slate-100 transition-all min-w-[100px]"
                                            >
                                                <span className="text-xl">{selectedRegionCreate.flag}</span>
                                                <span className="text-sm font-bold text-slate-700">{selectedRegionCreate.dial}</span>
                                                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isRegionDropdownOpenCreate && "rotate-180")} />
                                            </button>

                                            {isRegionDropdownOpenCreate && (
                                                <div className="absolute top-full left-0 mt-2 w-[240px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="p-2 space-y-1">
                                                        {REGIONS.map((region) => (
                                                            <button
                                                                key={region.code}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedRegionCreate(region);
                                                                    setIsRegionDropdownOpenCreate(false);
                                                                    setCreateUserData(prev => ({ ...prev, phone: "" }));
                                                                }}
                                                                className={cn(
                                                                    "w-full px-4 py-3 rounded-xl flex items-center justify-between text-left hover:bg-indigo-50 transition-colors group",
                                                                    selectedRegionCreate.code === region.code && "bg-indigo-50"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xl">{region.flag}</span>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-900">{region.name}</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold">{region.dial}</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-black text-indigo-500 opacity-0 group-hover:opacity-100">{region.code}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative flex-1 group">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                required
                                                type="tel"
                                                maxLength={selectedRegionCreate.phoneLimit}
                                                placeholder={`${selectedRegionCreate.phoneLimit} digits`}
                                                value={createUserData.phone}
                                                onChange={(e) => setCreateUserData(prev => ({ 
                                                    ...prev, 
                                                    phone: e.target.value.replace(/\D/g, '').slice(0, selectedRegionCreate.phoneLimit) 
                                                }))}
                                                className="w-full pl-12 pr-6 h-14 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">{t('admin.create_modal.role')}</label>
                                    <select
                                        value={createUserData.role}
                                        onChange={(e) => setCreateUserData(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    >
                                        <option value="owner">{t('admin.owner')}</option>
                                        <option value="customer">{t('admin.customer')}</option>
                                        <option value="admin">{t('admin.role')}</option>
                                    </select>
                                </div>
                                <button
                                    disabled={createLoading || createUserData.phone.length < selectedRegionCreate.phoneLimit}
                                    type="submit"
                                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-4 shadow-lg shadow-indigo-200"
                                >
                                    {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.create_modal.cta')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
