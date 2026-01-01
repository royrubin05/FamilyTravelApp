import { getCurrentUser } from "@/lib/auth-context";
import { redirect } from "next/navigation";

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
            {children}
        </div>
    );
}
