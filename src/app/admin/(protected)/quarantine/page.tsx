
import React from 'react';
import { getQuarantinedEmails } from "../actions";
import Link from "next/link";

export default async function QuarantinePage() {
    const { success, data } = await getQuarantinedEmails(50);
    const emails = success ? (data || []) : [];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-slate-800">Invalid Email Imports (Quarantine)</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Received</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">From</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {emails.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-slate-500">
                                    No quarantined emails found.
                                </td>
                            </tr>
                        ) : (
                            emails.map((email: any) => (
                                <tr key={email.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {new Date(email.receivedAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 max-w-xs truncate">
                                        {email.subject}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {email.userEmail}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-red-600">
                                        {email.validation?.reason || "Unknown"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {email.validation?.score?.toFixed(2) || "0.00"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${email.status === 'FORCED_IMPORT'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {email.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/admin/quarantine/${email.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
