import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { notFound } from "next/navigation";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface RecordingPageProps {
  params: Promise<{ token: string }>;
}

export default async function RecordingPage({ params }: RecordingPageProps) {
  const { token } = await params;

  // Find recording by share token
  const recording = await db.query.recordings.findFirst({
    where: and(
      eq(recordings.shareToken, token),
      gt(recordings.shareExpires, new Date())
    ),
  });

  if (!recording) {
    notFound();
  }

  // Generate presigned URL for download
  let downloadUrl = "";
  try {
    const endpoint = process.env.S3_ENDPOINT;
    const s3Client = new S3Client({
      region: "auto",
      endpoint: endpoint?.startsWith("http") ? endpoint : `https://${endpoint}`,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: recording.s3Key,
      ResponseContentDisposition: `attachment; filename="${recording.roomName}-recording.mp4"`,
    });

    downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("Failed to generate download URL:", error);
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card rounded-lg border p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-2">{recording.roomName}</h1>
        <p className="text-muted-foreground mb-6">
          Recording from {new Date(recording.createdAt).toLocaleDateString()}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-muted-foreground">Duration</div>
            <div className="font-medium">{formatDuration(recording.duration)}</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-muted-foreground">Size</div>
            <div className="font-medium">{formatSize(recording.size)}</div>
          </div>
        </div>

        {downloadUrl ? (
          <a
            href={downloadUrl}
            className="inline-block w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition"
          >
            Download Recording
          </a>
        ) : (
          <div className="text-destructive">Failed to generate download link</div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          This link expires on{" "}
          {recording.shareExpires?.toLocaleDateString() || "soon"}
        </p>
      </div>
    </main>
  );
}
