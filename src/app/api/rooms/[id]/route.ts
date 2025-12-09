import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try to find by ID first, then by slug
    let room = await db.query.rooms.findFirst({
      where: eq(rooms.id, id),
    });

    if (!room) {
      room = await db.query.rooms.findFirst({
        where: eq(rooms.slug, id),
      });
    }

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Don't expose password hash
    const { password, ...roomData } = room;

    return NextResponse.json({
      room: {
        ...roomData,
        hasPassword: !!password,
      },
    });
  } catch (error) {
    console.error("Get room error:", error);
    return NextResponse.json(
      { error: "Failed to get room" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, id), eq(rooms.ownerId, session.user.id)),
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found or unauthorized" },
        { status: 404 }
      );
    }

    await db.delete(rooms).where(eq(rooms.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete room error:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
