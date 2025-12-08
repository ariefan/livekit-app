import { NextRequest, NextResponse } from "next/server";
import { chat, AI_PROMPTS } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { transcript, action } = await request.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    if (!action || !["summarize", "actionItems", "keyPoints"].includes(action)) {
      return NextResponse.json(
        { error: "Valid action is required (summarize, actionItems, keyPoints)" },
        { status: 400 }
      );
    }

    const systemPrompt = AI_PROMPTS[action as keyof typeof AI_PROMPTS];

    const result = await chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Meeting Transcript:\n\n${transcript}` },
    ]);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
