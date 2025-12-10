import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/db";
import { rooms, recordings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CreateRoomButton } from "@/components/dashboard/create-room-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const userRooms = await db.query.rooms.findMany({
    where: eq(rooms.ownerId, session!.user.id),
    orderBy: [desc(rooms.createdAt)],
    limit: 5,
  });

  const userRecordings = await db.query.recordings.findMany({
    where: eq(recordings.ownerId, session!.user.id),
    orderBy: [desc(recordings.createdAt)],
    limit: 5,
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {session?.user.name || "there"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your rooms and recordings
          </p>
        </div>
        <CreateRoomButton />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg p-6 border">
          <div className="text-3xl font-bold text-primary">{userRooms.length}</div>
          <div className="text-muted-foreground mt-1">Active Rooms</div>
        </div>
        <div className="bg-card rounded-lg p-6 border">
          <div className="text-3xl font-bold text-green-600">{userRecordings.length}</div>
          <div className="text-muted-foreground mt-1">Recordings</div>
        </div>
        <div className="bg-card rounded-lg p-6 border">
          <div className="text-3xl font-bold text-purple-600">
            {userRooms.filter((r) => r.isScheduled).length}
          </div>
          <div className="text-muted-foreground mt-1">Scheduled Meetings</div>
        </div>
      </div>

      {/* Recent rooms */}
      <div className="bg-card rounded-lg border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Rooms</h2>
          <Link
            href="/rooms"
            className="text-sm text-primary hover:text-primary/80"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {userRooms.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              No rooms yet. Create your first room to get started!
            </div>
          ) : (
            userRooms.map((room) => (
              <div
                key={room.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {room.isScheduled && room.scheduledAt
                      ? `Scheduled for ${new Date(room.scheduledAt).toLocaleString()}`
                      : `Created ${new Date(room.createdAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      room.allowGuests
                        ? "bg-green-600 hover:bg-green-600 text-white"
                        : "bg-yellow-600 hover:bg-yellow-600 text-white"
                    }
                  >
                    {room.allowGuests ? "Guests allowed" : "Members only"}
                  </Badge>
                  <Button size="sm" asChild>
                    <Link href={`/room/${room.slug}`}>Join</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent recordings */}
      <div className="bg-card rounded-lg border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Recordings</h2>
          <Link
            href="/recordings"
            className="text-sm text-primary hover:text-primary/80"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {userRecordings.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              No recordings yet. Start a meeting and record it!
            </div>
          ) : (
            userRecordings.map((recording) => (
              <div
                key={recording.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{recording.roomName}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(recording.createdAt).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {recording.status === "completed" && recording.duration && (
                      <> • {formatDuration(recording.duration)}</>
                    )}
                  </div>
                </div>
                <Badge
                  className={
                    recording.status === "completed"
                      ? "bg-green-600 hover:bg-green-600 text-white"
                      : recording.status === "recording"
                        ? "bg-blue-600 hover:bg-blue-600 text-white"
                        : "bg-red-600 hover:bg-red-600 text-white"
                  }
                >
                  {recording.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
