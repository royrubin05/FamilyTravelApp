import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileText, User, Check, ChevronLeft } from "lucide-react";
import Link from "next/link";

const FAMILY_MEMBERS = [
    { id: "dad", name: "Dad" },
    { id: "mom", name: "Mom" },
    { id: "daughter", name: "Sarah" },
    { id: "son", name: "Leo" },
];

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-zinc-50/50 p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to App
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Trip Administration</h1>
                        <p className="text-muted-foreground">Upload and assign travel documents to family members.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Upload Section */}
                    <Card className="md:col-span-2 border-dashed border-2 shadow-none bg-zinc-50/50 min-h-[400px] flex flex-col items-center justify-center text-center p-8 transition-colors hover:bg-zinc-50/80">
                        <div className="rounded-full bg-blue-50 p-6 mb-4">
                            <Upload className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Upload Itinerary PDF</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Drag and drop your flight confirmations or hotel booking PDFs here to automatically parse details.
                        </p>
                        <Button size="lg" className="relative">
                            Select File
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf" />
                        </Button>
                    </Card>

                    {/* Sidebar / Status */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Family Status</CardTitle>
                                <CardDescription>Itinerary completeness</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {FAMILY_MEMBERS.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                {member.name[0]}
                                            </div>
                                            <span className="font-medium">{member.name}</span>
                                        </div>
                                        {/* Mock Status */}
                                        {member.id === 'dad' ? (
                                            <div className="flex items-center text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full">
                                                <Check className="h-3 w-3 mr-1" /> Complete
                                            </div>
                                        ) : (
                                            <div className="text-xs text-muted-foreground">Missing Info</div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-600 text-white border-none">
                            <CardContent className="p-6">
                                <FileText className="h-8 w-8 mb-4 opacity-80" />
                                <h3 className="font-bold text-lg mb-1">Processing...</h3>
                                <p className="text-blue-100 text-sm mb-4">The AI is ready to parse your documents.</p>
                                <div className="h-1.5 w-full bg-blue-500/50 rounded-full overflow-hidden">
                                    <div className="h-full w-2/3 bg-white rounded-full animate-pulse" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
