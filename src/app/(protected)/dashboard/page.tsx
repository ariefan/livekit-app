import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/db";
import { rooms, recordings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CreateRoomButton } from "@/components/dashboard/create-room-button";

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {session?.user.name || "there"}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your rooms and recordings
          </p>
        </div>
        <CreateRoomButton />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-blue-600">{userRooms.length}</div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">Active Rooms</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-green-600">{userRecordings.length}</div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">Recordings</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-purple-600">
            {userRooms.filter((r) => r.isScheduled).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">Scheduled Meetings</div>
        </div>
      </div>

      {/* Recent rooms */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Rooms</h2>
          <Link
            href="/dashboard/rooms"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {userRooms.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
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
                  <div className="text-sm text-gray-500">
                    {room.isScheduled && room.scheduledAt
                      ? `Scheduled for ${new Date(room.scheduledAt).toLocaleString()}`
                      : `Created ${new Date(room.createdAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      room.allowGuests
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                    }`}
                  >
                    {room.allowGuests ? "Guests allowed" : "Members only"}
                  </span>
                  <Link
                    href={`/room/${room.slug}`}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Join
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent recordings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Recordings</h2>
          <Link
            href="/dashboard/recordings"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {userRecordings.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
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
                  <div className="text-sm text-gray-500">
                    {new Date(recording.createdAt).toLocaleDateString()} •{" "}
                    {recording.duration
                      ? `${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, "0")}`
                      : "Processing..."}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    recording.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : recording.status === "recording"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {recording.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
