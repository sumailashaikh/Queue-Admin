"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function InviteLandingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token"), [params]);

  useEffect(() => {
    if (token) {
      try {
        localStorage.setItem("pending_invite_token", token);
      } catch { }
    }
    router.replace("/login");
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm p-8 max-w-md w-full text-center">
        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 font-black">
          Q
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Opening your invite…</h1>
        <p className="text-sm font-bold text-slate-400 mt-2">
          Redirecting to login to verify with OTP.
        </p>
      </div>
    </div>
  );
}

export default function InviteLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm p-8 max-w-md w-full text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 font-black">
              Q
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Opening your invite…</h1>
            <p className="text-sm font-bold text-slate-400 mt-2">Loading…</p>
          </div>
        </div>
      }
    >
      <InviteLandingInner />
    </Suspense>
  );
}

