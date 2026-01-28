"use client";

import NeuralBackground from "@/components/NeuralBackground";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Search,
  PenTool,
  CheckCircle2,
  Terminal,
  Activity,
  ShieldAlert,
  Cpu,
  Zap
} from "lucide-react";

// --- Types ---
type AgentRole = "manager" | "researcher" | "writer" | "reviewer" | "system";

interface LogMessage {
  role: AgentRole;
  content: string;
  timestamp: string;
}

interface SwarmState {
  isProcessing: boolean;
  isPaused: boolean;
  messages: LogMessage[];
  finalDraft: string | null;
  researchCache: string[];
}

export default function NexusCommandConsole() {
  const [goal, setGoal] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [swarmState, setSwarmState] = useState<SwarmState>({
    isProcessing: false,
    isPaused: false,
    messages: [],
    finalDraft: null,
    researchCache: []
  });

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [swarmState.messages]);

  // --- API Interaction ---
  const initializeMission = async () => {
    if (!goal) return;

    setSwarmState(prev => ({
      ...prev,
      isProcessing: true,
      messages: [...prev.messages, { role: "system", content: `Mission Initialized: ${goal}`, timestamp: new Date().toLocaleTimeString() }]
    }));

    try {
      const res = await fetch("http://localhost:8000/mission/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, model: "gpt-4o-mini" })
      });
      const data = await res.json();
      setThreadId(data.thread_id);
      startStream(data.thread_id);
    } catch (e) {
      console.error(e);
      setSwarmState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const startStream = async (tid: string) => {
    try {
      const res = await fetch(`http://localhost:8000/mission/stream/${tid}`);
      const data = await res.json();

      processEvents(data.events);

      if (data.is_paused) {
        setSwarmState(prev => ({
          ...prev,
          isPaused: true,
          researchCache: data.current_state.research_notes || []
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const approveMission = async () => {
    if (!threadId) return;
    setSwarmState(prev => ({ ...prev, isPaused: false }));

    try {
      const res = await fetch("http://localhost:8000/mission/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, approve: true })
      });
      const data = await res.json(); // { events, final_output, status }

      processEvents(data.events);

      if (data.final_output) {
        setSwarmState(prev => ({ ...prev, finalDraft: data.final_output, isProcessing: false }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const processEvents = (events: any[]) => {
    const newLogs: LogMessage[] = [];

    events.forEach(evt => {
      Object.entries(evt).forEach(([node, values]: [string, any]) => {
        const ts = new Date().toLocaleTimeString();
        if (node === "manager") newLogs.push({ role: "manager", content: `Orchestrating logic. Route -> ${values.next_agent?.toUpperCase()}`, timestamp: ts });
        if (node === "researcher") newLogs.push({ role: "researcher", content: `Intelligence gathered from secure channels.`, timestamp: ts });
        if (node === "writer") newLogs.push({ role: "writer", content: `Synthesizing accumulated intelligence into draft.`, timestamp: ts });
        if (node === "reviewer") newLogs.push({ role: "reviewer", content: `Quality Audit: ${values.revision_notes}`, timestamp: ts });
      });
    });

    setSwarmState(prev => ({ ...prev, messages: [...prev.messages, ...newLogs] }));
  };

  // --- Render Helpers ---
  const getIcon = (role: AgentRole) => {
    switch (role) {
      case "manager": return <Cpu className="w-4 h-4 text-amber-500" />;
      case "researcher": return <Search className="w-4 h-4 text-emerald-500" />;
      case "writer": return <PenTool className="w-4 h-4 text-blue-500" />;
      case "reviewer": return <CheckCircle2 className="w-4 h-4 text-red-500" />;
      default: return <Terminal className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30">
      <NeuralBackground />
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              NEXUS <span className="text-white/40 font-light">SWARM</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-white/50 bg-black/20 px-3 py-1 rounded-full border border-white/5">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]" /> ONLINE</span>
            <span className="w-px h-3 bg-white/10" />
            <span>V1.0.0</span>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Col: Controls & Logs */}
        <div className="lg:col-span-7 space-y-6">

          {/* Input Console */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Terminal className="w-24 h-24 rotate-12" />
            </div>

            <div className="flex items-center gap-2 mb-4 text-sm font-bold text-indigo-300 tracking-wider">
              <Terminal className="w-4 h-4" />
              MISSION PARAMETERS
            </div>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Initialize swarm protocol with specific research objectives..."
              className="w-full glass-input rounded-xl p-4 text-sm resize-none h-32 placeholder:text-white/20"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setGoal("");
                  setThreadId(null);
                  setSwarmState({ isProcessing: false, isPaused: false, messages: [], finalDraft: null, researchCache: [] });
                }}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white/50 hover:text-white hover:bg-white/5 transition-all"
              >
                CLEAR
              </button>
              <button
                onClick={initializeMission}
                disabled={swarmState.isProcessing && !swarmState.isPaused}
                className="glass-button px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
              >
                <Zap className="w-4 h-4 group-hover/btn:fill-current transition-all" />
                INITIALIZE SWARM
              </button>
            </div>
          </div>

          {/* Telemetry Log */}
          <div className="glass-card rounded-2xl p-6 min-h-[500px] max-h-[600px] flex flex-col">
            <div className="flex items-center gap-2 mb-6 text-sm font-bold text-emerald-300 tracking-wider">
              <Activity className="w-4 h-4" />
              NEURAL TELEMETRY
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {swarmState.messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10, filter: "blur(5px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="mt-1 p-2 rounded-lg bg-black/20 h-fit border border-white/5 group-hover:border-white/10 transition-colors">
                      {getIcon(msg.role)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/80 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{msg.role}</span>
                        <span className="text-[10px] font-mono text-white/30">{msg.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-300 font-light leading-relaxed">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logEndRef} />
            </div>
          </div>

        </div>

        {/* Right Col: Output & State */}
        <div className="lg:col-span-5 space-y-6">

          {/* HITL Interrupt Card */}
          <AnimatePresence>
            {swarmState.isPaused && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-2xl p-6 border-amber-500/30 bg-amber-950/20"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30 animate-pulse">
                    <ShieldAlert className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-400 mb-1">Authorization Required</h3>
                    <p className="text-xs text-amber-200/60 mb-4 uppercase tracking-wider font-semibold">
                      Human-in-the-Loop Protocol Active
                    </p>

                    <div className="bg-black/40 rounded-lg p-4 mb-4 text-xs font-mono text-neutral-400 max-h-40 overflow-y-auto border border-white/5">
                      {swarmState.researchCache[swarmState.researchCache.length - 1] || "No Data"}
                    </div>

                    <button
                      onClick={approveMission}
                      className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      AUTHORIZE SYNTHESIS
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final Output */}
          <div className="glass-card rounded-2xl flex flex-col h-full min-h-[500px] relative overflow-hidden ring-1 ring-white/10">

            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none -ml-10 -mb-10" />

            {/* Document Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">INTELLIGENCE OUTPUT</h2>
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Nexus Swarm Synthesis v1.0</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Secure</span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-0 overflow-hidden relative z-0">
              {swarmState.finalDraft ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full overflow-y-auto custom-scrollbar p-8"
                >
                  <div className="prose prose-invert prose-sm max-w-none 
                     prose-headings:text-indigo-300 prose-headings:font-bold prose-headings:tracking-tight
                     prose-p:text-gray-300 prose-p:leading-relaxed 
                     prose-strong:text-teal-300 prose-strong:font-bold
                     prose-ul:text-gray-300 prose-li:marker:text-indigo-500"
                  >
                    <div className="whitespace-pre-wrap font-light">{swarmState.finalDraft}</div>
                  </div>

                  {/* End of Report Marker */}
                  <div className="mt-12 flex items-center justify-center gap-4 opacity-50">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-600" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">End of Transmission</span>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-600" />
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/20">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10 backdrop-blur-sm">
                      <Bot className="w-10 h-10 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 text-indigo-300" />
                    </div>
                  </div>
                  <p className="mt-6 text-sm font-mono uppercase tracking-widest text-indigo-200/40 animate-pulse">Awaiting Neural Synthesis...</p>
                </div>
              )}
            </div>

            {/* Status Footer */}
            {swarmState.finalDraft && (
              <div className="px-6 py-3 bg-indigo-950/30 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span>WORDS: {swarmState.finalDraft.split(" ").length}</span>
                <span>STATUS: FINALIZED</span>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
