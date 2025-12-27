import { getFamilies } from "@/app/admin/actions";
import CreateFamilyForm from "@/components/admin/CreateFamilyForm";
import FamilyListClient from "@/components/admin/FamilyListClient";

export default async function AdminFamiliesPage() {
    const { data: families, error } = await getFamilies();

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                Error loading families: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Families</h1>
                    <p className="text-neutral-400">Manage family accounts and access.</p>
                </div>
                <CreateFamilyForm />
            </div>

            <FamilyListClient initialFamilies={families || []} />
        </div>
    );
}
