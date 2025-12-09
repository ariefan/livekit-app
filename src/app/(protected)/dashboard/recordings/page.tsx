import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { RecordingsList } from "@/components/dashboard/recordings-list";

export default async function RecordingsPage() {
  const session = await getServerSession(authOptions);

  const userRecordings = await db.query.recordings.findMany({
    where: eq(recordings.ownerId, session!.user.id),
    orderBy: [desc(recordings.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Recordings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage and share your meeting recordings
        </p>
      </div>

      <RecordingsList recordings={userRecordings} />
    </div>
  );
}
