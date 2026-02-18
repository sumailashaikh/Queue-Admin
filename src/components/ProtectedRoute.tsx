"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, hasBusiness, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                router.push("/login");
            } else if (user?.role === 'admin') {
                // Admins are always allowed in dashboard
                if (pathname === "/setup") {
                    router.push("/dashboard");
                }
            } else if (!hasBusiness && pathname !== "/setup") {
                router.push("/setup");
            } else if (hasBusiness && pathname === "/setup") {
                router.push("/dashboard");
            }
        }
    }, [isAuthenticated, hasBusiness, loading, router, pathname, user?.role]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) return null;
    if (user?.role !== 'admin' && !hasBusiness && pathname !== "/setup") return null;

    return <>{children}</>;
}
