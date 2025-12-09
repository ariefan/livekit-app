import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import { generateRoomSlug } from "@/lib/room-slug";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, password, allowGuests = true, isScheduled = false, scheduledAt } = body;

    // Generate unique slug
    let slug = generateRoomSlug();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.query.rooms.findFirst({
        where: (rooms, { eq }) => eq(rooms.slug, slug),
      });
      if (!existing) break;
      slug = generateRoomSlug();
      attempts++;
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    const room = await db
      .insert(rooms)
      .values({
        id: uuidv4(),
        slug,
        name: name || `Meeting ${new Date().toLocaleDateString()}`,
        ownerId: session.user.id,
        password: hashedPassword,
        allowGuests,
        isScheduled,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      })
      .returning();

    return NextResponse.json({ room: room[0] });
  } catch (error) {
    console.error("Create room error:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRooms = await db.query.rooms.findMany({
      where: (rooms, { eq }) => eq(rooms.ownerId, session.user.id),
      orderBy: (rooms, { desc }) => [desc(rooms.createdAt)],
    });

    return NextResponse.json({ rooms: userRooms });
  } catch (error) {
    console.error("Get rooms error:", error);
    return NextResponse.json(
      { error: "Failed to get rooms" },
      { status: 500 }
    );
  }
}
