
import React from 'react';
import { getQuarantinedEmailDetails, forceParseQuarantinedEmail } from "../../actions";
import Link from "next/link";
import { redirect } from 'next/navigation';

export default async function QuarantineDetailPage({ params }: { params: { id: string } }) {
    const { success, data: email } = await getQuarantinedEmailDetails(params.id);

    if (!success || !email) {
        return <div className="p-8">Email not found.</div>;
    }

    async function handleForceParse() {
        "use server";
        await forceParseQuarantinedEmail(params.id);
        redirect("/admin/quarantine");
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <Link href="/admin/quarantine" className="text-indigo-600 hover:text-indigo-900">
                    &larr; Back to Quarantine
                </Link>
                <div className="space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${email.status === 'FORCED_IMPORT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {email.status}
                    </span>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">{email.subject}</h1>
                        <p className="text-sm text-slate-600">From: {email.userEmail}</p>
                        <p className="text-sm text-slate-600">Received: {new Date(email.receivedAt).toLocaleString()}</p>
                    </div>
                    {email.status !== 'FORCED_IMPORT' && (
                        <form action={handleForceParse}>
                            <button className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition">
                                Force Send to Parser
                            </button>
                        </form>
                    )}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-red-50 p-4 rounded border border-red-100">
                        <h3 className="text-sm font-bold text-red-800 uppercase mb-2">Validation Analysis</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-semibold">Status:</span> {email.validation?.status}</p>
                            <p><span className="font-semibold">Score:</span> {email.validation?.score?.toFixed(2)}</p>
                            <p><span className="font-semibold">Reason:</span> {email.validation?.reason}</p>
                            <p className="italic text-slate-600 mt-2">"{email.validation?.explanation}"</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2">Payload Details</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-semibold">Attachments:</span> {email.rawPayload?.attachments?.length || 0}</p>
                            <p><span className="font-semibold">Body Size:</span> {email.rawPayload?.textBody?.length || 0} chars</p>
                            <p><span className="font-semibold">Trip ID:</span> {email.tripId || "N/A"}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Raw Email Body</h3>
                    <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {email.rawPayload?.textBody || "No text body content."}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
