import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const recording = await db.query.recordings.findFirst({
      where: eq(recordings.id, id),
    });

    if (!recording || recording.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    if (recording.status !== "completed") {
      return NextResponse.json(
        { error: "Recording not yet completed" },
        { status: 400 }
      );
    }

    // Generate presigned URL for streaming (no download headers)
    const endpoint = process.env.S3_ENDPOINT;
    const accessKey = process.env.S3_ACCESS_KEY_ID;
    const secret = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;

    if (!endpoint || !accessKey || !secret || !bucket) {
      return NextResponse.json(
        { error: "S3 configuration not complete" },
        { status: 500 }
      );
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${endpoint}`,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secret,
      },
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
    console.error("Stream API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate stream URL" },
      { status: 500 }
    );
  }
}
