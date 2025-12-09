import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const recording = await db.query.recordings.findFirst({
      where: and(
        eq(recordings.id, id),
        eq(recordings.ownerId, session.user.id)
      ),
    });

    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found or unauthorized" },
        { status: 404 }
      );
    }

    // Generate share token
    const shareToken = uuidv4();
    const shareExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db
      .update(recordings)
      .set({
        shareToken,
        shareExpires,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, id));

    return NextResponse.json({ shareToken, shareExpires });
  } catch (error) {
    console.error("Share recording error:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}
