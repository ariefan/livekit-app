import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(
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

    // Generate presigned URL for download
    const s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: recording.s3Key,
      ResponseContentDisposition: `attachment; filename="${recording.roomName}-${new Date(recording.createdAt).toISOString().split("T")[0]}.mp4"`,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error("Download recording error:", error);
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    );
  }
}
