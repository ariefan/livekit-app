import { NextRequest, NextResponse } from "next/server";
import { EgressClient, EncodedFileOutput, S3Upload, EncodedFileType } from "livekit-server-sdk";

// Create Egress client
function getEgressClient() {
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured");
  }

  return new EgressClient(livekitUrl, apiKey, apiSecret);
}

// Get S3 configuration
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
    forcePathStyle: true, // Required for S3-compatible services like iDrive E2
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

      await egressClient.stopEgress(egressId);

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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Recording API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process recording request" },
      { status: 500 }
    );
  }
}
