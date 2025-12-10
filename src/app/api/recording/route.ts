import { NextRequest, NextResponse } from "next/server";
import { EgressClient, EncodedFileOutput, S3Upload, EncodedFileType } from "livekit-server-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { recordings, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

function getEgressClient() {
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured");
  }

  return new EgressClient(livekitUrl, apiKey, apiSecret);
}

function getS3Config(): S3Upload {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secret = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";

  if (!endpoint || !accessKey || !secret || !bucket) {
    throw new Error("S3 configuration not complete");
  }

  return new S3Upload({
    accessKey,
    secret,
    bucket,
    region,
    endpoint: `https://${endpoint}`,
    forcePathStyle: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { action, roomName, egressId } = await request.json();

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const egressClient = getEgressClient();

    if (action === "start") {
      if (!roomName) {
        return NextResponse.json({ error: "Room name is required" }, { status: 400 });
      }

      // Get session to determine owner
      const session = await getServerSession(authOptions);

      // Find room to get owner
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.slug, roomName),
      });

      // Determine owner: session user, room owner, or null
      const ownerId = session?.user.id || room?.ownerId || null;

      if (!ownerId) {
        return NextResponse.json(
          { error: "Must be logged in to start recording" },
          { status: 401 }
        );
      }

      const s3Config = getS3Config();
      const timestamp = Date.now();
      const filepath = `recordings/${roomName}/${timestamp}.mp4`;

      const output = new EncodedFileOutput({
        filepath,
        output: {
          case: "s3",
          value: s3Config,
        },
        fileType: EncodedFileType.MP4,
      });

      const egress = await egressClient.startRoomCompositeEgress(
        roomName,
        { file: output },
        {
          layout: "grid",
          audioOnly: false,
          videoOnly: false,
        }
      );

      // Save recording to database
      await db.insert(recordings).values({
        id: uuidv4(),
        roomId: room?.id || null,
        ownerId: ownerId,
        egressId: egress.egressId,
        roomName: roomName,
        s3Key: filepath,
        status: "recording",
      });

      return NextResponse.json({
        success: true,
        egressId: egress.egressId,
        filepath,
      });
    }

    if (action === "stop") {
      if (!egressId) {
        return NextResponse.json({ error: "Egress ID is required" }, { status: 400 });
      }

      // Check egress status first before trying to stop
      try {
        const egresses = await egressClient.listEgress({ egressId });
        const egress = egresses[0];

        // EgressStatus: EGRESS_COMPLETE = 4, EGRESS_FAILED = 5
        if (!egress || egress.status >= 4) {
          // Already completed or failed - just update database
          const newStatus = !egress || egress.status === 5 ? "failed" : "completed";
          await db
            .update(recordings)
            .set({
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(recordings.egressId, egressId));

          return NextResponse.json({ success: true, alreadyCompleted: true });
        }

        // Still active - stop it
        await egressClient.stopEgress(egressId);
      } catch (e) {
        // If listEgress fails, try to stop anyway and update DB
        console.error("Error checking egress status:", e);
        try {
          await egressClient.stopEgress(egressId);
        } catch {
          // If stop also fails, just update database
        }
      }

      // Update recording status
      await db
        .update(recordings)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(recordings.egressId, egressId));

      return NextResponse.json({ success: true });
    }

    if (action === "status") {
      if (!roomName) {
        return NextResponse.json({ error: "Room name is required" }, { status: 400 });
      }

      const egresses = await egressClient.listEgress({ roomName });

      return NextResponse.json({
        recordings: egresses.map((e) => ({
          egressId: e.egressId,
          status: e.status,
          startedAt: e.startedAt,
          endedAt: e.endedAt,
        })),
      });
    }

    // Cleanup: sync database status with actual LiveKit egress status
    if (action === "cleanup") {
      const session = await getServerSession(authOptions);
      if (!session?.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Find all "recording" status recordings for this user
      const activeRecordings = await db.query.recordings.findMany({
        where: eq(recordings.ownerId, session.user.id),
      });

      const recordingStatusRecordings = activeRecordings.filter(
        (r) => r.status === "recording"
      );

      let cleaned = 0;

      for (const recording of recordingStatusRecordings) {
        try {
          // Check egress status from LiveKit
          const egresses = await egressClient.listEgress({
            egressId: recording.egressId,
          });

          const egress = egresses[0];

          // If egress doesn't exist, has ended, or has failed - update status
          if (!egress || egress.status >= 4) {
            // EgressStatus: EGRESS_COMPLETE = 4, EGRESS_FAILED = 5
            const newStatus = !egress || egress.status === 5 ? "failed" : "completed";

            await db
              .update(recordings)
              .set({
                status: newStatus,
                updatedAt: new Date(),
              })
              .where(eq(recordings.egressId, recording.egressId));

            cleaned++;
          }
        } catch (e) {
          // If we can't find the egress, mark as failed
          console.error(`Failed to check egress ${recording.egressId}:`, e);
          await db
            .update(recordings)
            .set({
              status: "failed",
              updatedAt: new Date(),
            })
            .where(eq(recordings.egressId, recording.egressId));
          cleaned++;
        }
      }

      return NextResponse.json({ success: true, cleaned });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Recording API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process recording request" },
      { status: 500 }
    );
  }
}
