"use client";

import { useState } from "react";
import { impersonateUser, FamilyUser } from "@/app/admin/actions";
import { signInWithCustomToken, getAuth } from "firebase/auth";
import { app } from "@/lib/firebase-config";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import EditFamilyModal from "./EditFamilyModal";

export default function FamilyListClient({ initialFamilies }: { initialFamilies: FamilyUser[] }) {
    const router = useRouter();
    // Safety check: app might be undefined if env vars are missing
    const auth = app ? getAuth(app) : null;
    const [editingFamily, setEditingFamily] = useState<FamilyUser | null>(null);
    const [impersonatingMap, setImpersonatingMap] = useState<Record<string, boolean>>({});

    const handleImpersonate = async (uid: string) => {
        setImpersonatingMap(prev => ({ ...prev, [uid]: true }));
        try {
            const formData = new FormData();
            formData.append("uid", uid);
            const res = await impersonateUser(formData);

            if (res.success && res.customToken) {
                if (!auth) {
                    alert("Firebase Client Auth not initialized. Check configuration.");
                    return;
                }
                // 1. Sign in on Client
                const userCredential = await signInWithCustomToken(auth, res.customToken);

                // 2. Get ID Token
                const idToken = await userCredential.user.getIdToken();

                // 3. Create Server Session
                const { createUserSession } = await import("@/app/auth-actions");
                await createUserSession(idToken);

                // 4. Force Hard Redirect
                window.location.href = "/";
            } else {
                alert("Failed to login as user: " + res.error);
            }
        } catch (error) {
            console.error(error);
            alert("Error logging in as user");
        } finally {
            setImpersonatingMap(prev => ({ ...prev, [uid]: false }));
        }
    };

    return (
        <>
            <div className="bg-white/5 rounded-xl shadow-sm border border-white/10 overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-neutral-400 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-3 font-medium">Display Name</th>
                            <th className="px-6 py-3 font-medium">Username</th>
                            <th className="px-6 py-3 font-medium">Role</th>
                            <th className="px-6 py-3 font-medium">Created</th>
                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {initialFamilies.map((family) => (
                            <tr key={family.uid} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    {family.displayName}
                                </td>
                                <td className="px-6 py-4 text-neutral-400 font-mono text-xs">
                                    {family.username}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${family.role === 'admin'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                                        }`}>
                                        {family.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-neutral-500">
                                    {new Date(family.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleImpersonate(family.uid)}
                                        disabled={impersonatingMap[family.uid]}
                                        className="text-amber-400 hover:text-amber-300 font-medium px-2 py-1 hover:bg-amber-500/10 rounded transition-colors mr-2 disabled:opacity-50"
                                        title="Login as this user"
                                    >
                                        {impersonatingMap[family.uid] ? (
                                            <span className="animate-pulse">...</span>
                                        ) : (
                                            <LogIn className="h-4 w-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setEditingFamily(family)}
                                        className="text-blue-400 hover:text-blue-300 font-medium px-2 py-1 hover:bg-blue-500/10 rounded transition-colors"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {initialFamilies.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                    No families found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <EditFamilyModal
                isOpen={!!editingFamily}
                family={editingFamily}
                onClose={() => setEditingFamily(null)}
                // We will perform a revalidation via server action in the modal usually, or here.
                // For now, simple implementation.
                onUpdateSuccess={() => {
                    router.refresh();
                }}
            />
        </>
    );
}
