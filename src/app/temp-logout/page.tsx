"use client";

import { logoutUser } from "@/app/auth-actions";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TempLogoutPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Logging out...");

    useEffect(() => {
        const doLogout = async () => {
            try {
                await logoutUser();
                setStatus("Logged out. Redirecting...");
                setTimeout(() => {
                    router.push("/login-v2");
                }, 1000);
            } catch (e) {
                setStatus("Logout failed: " + e);
            }
        };
        doLogout();
    }, [router]);

    return (
        <div className="p-10 font-bold text-center">
            {status}
        </div>
    );
}
