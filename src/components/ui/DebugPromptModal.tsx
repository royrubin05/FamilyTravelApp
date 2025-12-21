
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, Code, Cpu } from "lucide-react";

interface DebugPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    debugPrompt?: string;
    debugResponse?: string;
}

export function DebugPromptModal({ isOpen, onClose, debugPrompt, debugResponse }: DebugPromptModalProps) {
    const [activeTab, setActiveTab] = useState<"prompt" | "response">("response");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-4xl h-[80vh] bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#161b22]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Gemini Debugger</h3>
                            <p className="text-xs text-white/40">Inspect Prompt & Response</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-[#0d1117]">
                    <button
                        onClick={() => setActiveTab("prompt")}
                        className={`flex-1 py-3 px-6 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeTab === "prompt"
                            ? "bg-[#1f2937] text-white border-b-2 border-purple-500"
                            : "text-white/40 hover:text-white/70 hover:bg-white/5"
                            }`}
                    >
                        <Code className="h-4 w-4" />
                        System & Prompt
                    </button>
                    <button
                        onClick={() => setActiveTab("response")}
                        className={`flex-1 py-3 px-6 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeTab === "response"
                            ? "bg-[#1f2937] text-white border-b-2 border-green-500"
                            : "text-white/40 hover:text-white/70 hover:bg-white/5"
                            }`}
                    >
                        <Cpu className="h-4 w-4" />
                        AI Response
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-0 bg-[#0d1117]">
                    <pre className="p-6 text-xs leading-relaxed overflow-x-auto text-white/80">
                        {activeTab === "prompt" ? (
                            <code className="language-text">{debugPrompt || "No prompt data available."}</code>
                        ) : (
                            <code className="language-json text-green-300/90">{debugResponse || "No response data available."}</code>
                        )}
                    </pre>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#161b22] flex justify-between items-center text-xs text-white/40">
                    <p>Model: gemini-1.5-flash</p>
                    <p>Generated via Client Upload</p>
                </div>
            </motion.div>
        </div>
    );
}
