import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { room, username, roomPassword } = await request.json();

    if (!room || !username) {
      return NextResponse.json(
        { error: "Missing room or username" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    // Check if room exists in database and validate password if needed
    const dbRoom = await db.query.rooms.findFirst({
      where: eq(rooms.slug, room),
    });

    // If room exists in DB and has a password, validate it
    if (dbRoom && dbRoom.password) {
      if (!roomPassword) {
        return NextResponse.json(
          { error: "Room password is required" },
          { status: 401 }
        );
      }

      const isValidPassword = await bcrypt.compare(roomPassword, dbRoom.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid room password" },
          { status: 401 }
        );
      }
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: "1h",
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
