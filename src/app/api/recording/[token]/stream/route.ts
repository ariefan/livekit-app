import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const recording = await db.query.recordings.findFirst({
      where: eq(recordings.shareToken, token),
    });

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Check if share link has expired
    if (recording.shareExpires && new Date(recording.shareExpires) < new Date()) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    if (recording.status !== "completed") {
      return NextResponse.json(
        { error: "Recording not yet completed" },
        { status: 400 }
      );
    }

    // Generate presigned URL for streaming
    const endpoint = process.env.S3_ENDPOINT;
    const accessKey = process.env.S3_ACCESS_KEY_ID;
    const secret = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || "us-east-1";

    if (!endpoint || !accessKey || !secret || !bucket) {
      return NextResponse.json(
        { error: "S3 configuration not complete" },
        { status: 500 }
      );
    }

    const s3Client = new S3Client({
      region,
      endpoint: `https://${endpoint}`,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secret,
      },
      forcePathStyle: true,
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: recording.s3Key,
    });

    const videoUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({
      videoUrl,
      duration: recording.duration,
      chatLog: recording.chatLog,
      transcript: recording.transcript,
      recordingStartedAt: recording.recordingStartedAt?.getTime() || recording.createdAt.getTime(),
      roomName: recording.roomName,
      createdAt: recording.createdAt.getTime(),
    });
  } catch (error) {
    console.error("Public stream API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate stream URL" },
      { status: 500 }
    );
  }
}
