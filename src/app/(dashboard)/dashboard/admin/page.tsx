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
    Filter
} from "lucide-react";
import { adminService, DashboardUser, DashboardBusiness } from "@/services/adminService";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'users' | 'businesses'>('users');
    const [users, setUsers] = useState<DashboardUser[]>([]);
    const [businesses, setBusinesses] = useState<DashboardBusiness[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ page: 1, total: 0 });
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') {
                const res = await adminService.getAllUsers({ search, page: pagination.page });
                setUsers(res.data);
                setPagination(prev => ({ ...prev, total: res.pagination.total }));
            } else {
                const data = await adminService.getAllBusinesses();
                setBusinesses(data);
            }
        } catch (err) {
            console.error("Failed to fetch admin data:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, search, pagination.page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingRole(userId);
        try {
            await adminService.updateUserRole(userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
        } catch (err) {
            alert("Failed to update user role");
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
        } catch (err) {
            alert("Failed to update user status");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20 animate-in fade-in duration-1000">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Control Center</h1>
                    </div>
                    <p className="text-slate-500 font-medium text-sm">System oversight, user management, and platform health.</p>
                </div>

                <div className="flex items-center p-1 bg-slate-100 rounded-[20px] border border-slate-200/50">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={cn(
                            "px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-[16px] transition-all duration-300 flex items-center gap-2",
                            activeTab === 'users' ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10 scale-105" : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        <Users className="h-4 w-4" />
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('businesses')}
                        className={cn(
                            "px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-[16px] transition-all duration-300 flex items-center gap-2",
                            activeTab === 'businesses' ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10 scale-105" : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        <Store className="h-4 w-4" />
                        Businesses
                    </button>
                </div>
            </div>

            {/* Stats Overview (Mocked for UI) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Users', value: '1,284', icon: Users, color: 'blue' },
                    { label: 'Active Salons', value: '86', icon: Store, color: 'indigo' },
                    { label: 'Platform Health', value: '99.9%', icon: Shield, color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-[32px] p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                        <div className="flex items-center justify-between">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50 text-${stat.color}-600`)}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global</span>
                        </div>
                        <div className="mt-6 space-y-1">
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                            <p className="text-xs font-bold text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white border border-slate-100 rounded-[40px] shadow-sm overflow-hidden min-h-[500px]">
                {/* Search & Filter Bar */}
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Find user by name or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[20px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="h-14 px-6 border border-slate-100 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-600 hover:bg-slate-50 transition-all">
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600/20" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Synching with Mainframe...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activeTab === 'users' ? users.map((user) => (
                                    <tr key={user.id} className="group hover:bg-indigo-50/10 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                                                    {user.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <p className="font-bold text-slate-900 tracking-tight">{user.full_name || 'Incognito User'}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <select
                                                    disabled={updatingRole === user.id}
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-0 ring-1 ring-inset outline-none focus:ring-2",
                                                        user.role === 'admin' ? "bg-indigo-50 text-indigo-700 ring-indigo-200" :
                                                            user.role === 'owner' ? "bg-blue-50 text-blue-700 ring-blue-200" :
                                                                "bg-slate-50 text-slate-500 ring-slate-200"
                                                    )}
                                                >
                                                    <option value="customer">Customer</option>
                                                    <option value="owner">Owner</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <div className={cn(
                                                    "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-tighter w-fit",
                                                    user.status === 'active' ? "bg-emerald-50 text-emerald-600" :
                                                        user.status === 'blocked' ? "bg-red-50 text-red-600" :
                                                            "bg-amber-50 text-amber-600"
                                                )}>
                                                    {user.status}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-bold text-slate-600">{user.phone || 'No phone'}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <p className="text-xs font-bold text-slate-900">{new Date(user.created_at).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 text-right">
                                                {user.status !== 'active' && (
                                                    <button
                                                        onClick={() => handleStatusChange(user.id, 'active', true)}
                                                        className="h-8 px-3 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Verify
                                                    </button>
                                                )}
                                                {user.status !== 'blocked' && (
                                                    <button
                                                        onClick={() => handleStatusChange(user.id, 'blocked')}
                                                        className="h-8 px-3 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-1"
                                                    >
                                                        <XCircle className="h-3 w-3" />
                                                        Block
                                                    </button>
                                                )}
                                                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : businesses.map((business) => (
                                    <tr key={business.id} className="group hover:bg-blue-50/10 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="font-black text-slate-900 tracking-tight text-base">{business.name}</p>
                                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">/{business.slug}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black text-slate-900">{business.owner?.full_name || 'System Owner'}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{business.owner?.phone || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-bold text-slate-600">{new Date(business.created_at).toLocaleDateString()}</td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="h-10 px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">
                                                Inspect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {activeTab === 'users' && !loading && users.length > 0 && (
                    <div className="p-8 border-t border-slate-50 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-slate-900">{(pagination.page - 1) * 20 + 1}-{Math.min(pagination.page * 20, pagination.total)}</span> of {pagination.total} users
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                className="h-12 w-12 flex items-center justify-center border border-slate-100 rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-all"
                            >
                                <ArrowUpDown className="h-4 w-4 rotate-90" />
                            </button>
                            <button
                                disabled={pagination.page * 20 >= pagination.total}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                className="h-12 w-12 flex items-center justify-center border border-slate-100 rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-all"
                            >
                                <ArrowUpDown className="h-4 w-4 -rotate-90" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
