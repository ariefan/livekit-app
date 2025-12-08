"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckSquare, Lightbulb, Sparkles, Copy, Check } from "lucide-react";

interface AIAssistantPanelProps {
  transcript: string;
}

type AIAction = "summarize" | "actionItems" | "keyPoints";

export function AIAssistantPanel({ transcript }: AIAssistantPanelProps) {
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const generateResult = async (action: AIAction) => {
    if (!transcript.trim()) {
      setError("No transcript available yet. Start speaking with captions enabled.");
      return;
    }

    setIsLoading(true);
    setActiveAction(action);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate result");
      }

      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Failed to copy
    }
  };

  const actions = [
    {
      id: "summarize" as AIAction,
      label: "Summary",
      icon: FileText,
      description: "Get a concise summary",
    },
    {
      id: "actionItems" as AIAction,
      label: "Action Items",
      icon: CheckSquare,
      description: "Extract tasks & to-dos",
    },
    {
      id: "keyPoints" as AIAction,
      label: "Key Points",
      icon: Lightbulb,
      description: "Highlight main points",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          AI Assistant
        </h3>
        <p className="text-zinc-500 text-xs mt-1">
          Analyze meeting transcript with AI
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Transcript status */}
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm">Transcript</span>
            <span className="text-zinc-500 text-xs">
              {transcript.length > 0 ? `${transcript.split("\n").length} lines` : "Empty"}
            </span>
          </div>
          {transcript.length > 0 ? (
            <p className="text-zinc-300 text-xs mt-2 line-clamp-3">
              {transcript.slice(-200)}...
            </p>
          ) : (
            <p className="text-zinc-500 text-xs mt-2">
              Enable captions and start speaking to build transcript
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-left"
              onClick={() => generateResult(action.id)}
              disabled={isLoading || !transcript.trim()}
            >
              {isLoading && activeAction === action.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              ) : (
                <action.icon className="h-4 w-4 text-purple-400" />
              )}
              <div>
                <div className="text-white text-sm font-medium">{action.label}</div>
                <div className="text-zinc-500 text-xs">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-purple-400" />
                {activeAction === "summarize" && "Meeting Summary"}
                {activeAction === "actionItems" && "Action Items"}
                {activeAction === "keyPoints" && "Key Points"}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-7 text-zinc-400 hover:text-white"
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <p className="text-zinc-500 text-xs text-center">
          Powered by AI
        </p>
      </div>
    </div>
  );
}
