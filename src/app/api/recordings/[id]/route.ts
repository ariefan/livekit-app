import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user.id) {
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

    // Delete from S3
    const endpoint = process.env.S3_ENDPOINT;
    const s3Client = new S3Client({
      region: "auto",
      endpoint: endpoint?.startsWith("http") ? endpoint : `https://${endpoint}`,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });

    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: recording.s3Key,
        })
      );
    } catch (s3Error) {
      console.error("Failed to delete from S3:", s3Error);
      // Continue to delete from database even if S3 deletion fails
    }

    // Delete from database
    await db.delete(recordings).where(eq(recordings.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete recording error:", error);
    return NextResponse.json(
      { error: "Failed to delete recording" },
      { status: 500 }
    );
  }
}
