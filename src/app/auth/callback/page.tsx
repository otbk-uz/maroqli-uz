"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";

export default function AuthCallbackPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session && session.user) {
          // Fetch or ensure user profile exists
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          setAuth(
            {
              id: session.user.id,
              nickname: profile?.username || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Foydalanuvchi",
              full_name: profile?.full_name || session.user.user_metadata?.full_name || "",
              email: session.user.email,
              role: profile?.role || "GAMER",
              avatar: profile?.avatar_url || session.user.user_metadata?.avatar_url,
              is_premium: profile?.is_premium || false,
            },
            session.access_token
          );

          router.replace("/");
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        router.replace("/login");
      }
    };

    handleAuthCallback();
  }, [router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-secondary">Tizimga kirilmoqda, iltimos kuting...</p>
      </div>
    </div>
  );
}
