"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./auth.module.css";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (pathname === "/login") {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        });
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className={styles.loadingScreeen}>
        <DotLottieReact
          src="https://lottie.host/3d2b9ce7-6ec0-4df8-9943-e859f6d84850/cwahzJ2gow.lottie"
          loop
          autoplay
        />
      </div>
    );
  }

  return <>{isAuthenticated || pathname === "/login" ? children : null}</>;
}