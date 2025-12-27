"use client";
import { useState } from "react";
import { inspect2025Data } from "./inspectAction";

export default function InspectPage() {
    const [logs, setLogs] = useState<string[]>([]);

    const handleRun = async () => {
        setLogs(["Loading..."]);
        const res = await inspect2025Data();
        setLogs(res);
    };

    return (
        <div className="bg-neutral-900 text-green-400 p-8 min-h-screen font-mono whitespace-pre-wrap">
            <button onClick={handleRun} className="bg-red-600 text-white px-4 py-2 mb-4 rounded">
                Inspect 2025 Data
            </button>
            <div>
                {logs.join("\n")}
            </div>
        </div>
    );
}
