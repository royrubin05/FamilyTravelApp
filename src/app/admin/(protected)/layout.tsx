import { getCurrentUser } from "@/lib/auth-context";
import { redirect } from "next/navigation";
import { GlobalHeader } from "@/components/ui/GlobalHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            <GlobalHeader hideGlobalActions={true} />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row">
                    <AdminSidebar />
                    <div className="flex-1 min-w-0">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
