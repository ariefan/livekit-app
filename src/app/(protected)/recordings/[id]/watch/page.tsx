import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { VideoPlayerPage } from "@/components/video/video-player-page";

export default async function WatchRecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    redirect("/login");
  }

  const { id } = await params;

  // Verify ownership
  const recording = await db.query.recordings.findFirst({
    where: eq(recordings.id, id),
  });

  if (!recording || recording.ownerId !== session.user.id) {
    redirect("/dashboard/recordings");
  }

  return <VideoPlayerPage recordingId={id} />;
}
