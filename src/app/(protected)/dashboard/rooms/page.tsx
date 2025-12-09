import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CreateRoomButton } from "@/components/dashboard/create-room-button";
import { RoomsList } from "@/components/dashboard/rooms-list";

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);

  const userRooms = await db.query.rooms.findMany({
    where: eq(rooms.ownerId, session!.user.id),
    orderBy: [desc(rooms.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Rooms</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your meeting rooms
          </p>
        </div>
        <CreateRoomButton />
      </div>

      <RoomsList rooms={userRooms} />
    </div>
  );
}
