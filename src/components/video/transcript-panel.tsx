"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

interface TranscriptPanelProps {
  transcript: string | null;
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  if (!transcript) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">No transcript available for this recording</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {transcript}
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
