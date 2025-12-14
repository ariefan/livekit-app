import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { VideoPlayerPage } from "@/components/video/video-player-page";

export default async function PublicWatchRecordingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Verify share token
  const recording = await db.query.recordings.findFirst({
    where: eq(recordings.shareToken, token),
  });

  if (!recording) {
    redirect("/");
  }

  // Check if token has expired
  if (recording.shareExpires && recording.shareExpires < new Date()) {
    redirect("/");
  }

  return (
    <VideoPlayerPage
      recordingId={recording.id}
      isPublic={true}
      shareToken={token}
    />
  );
}
