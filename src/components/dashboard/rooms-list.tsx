"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Room {
  id: string;
  slug: string;
  name: string;
  isScheduled: boolean;
  scheduledAt: Date | null;
  allowGuests: boolean;
  password: string | null;
  createdAt: Date;
}

interface RoomsListProps {
  rooms: Room[];
}

export function RoomsList({ rooms }: RoomsListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    setDeletingId(roomId);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/room/${slug}`;
    navigator.clipboard.writeText(url);
    alert("Room link copied to clipboard!");
  };

  if (rooms.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">No rooms yet</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first room to start hosting meetings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Room
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rooms.map((room) => (
            <tr key={room.id}>
              <td className="px-6 py-4">
                <div>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-sm text-gray-500 font-mono">
                    {room.slug}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {room.isScheduled && room.scheduledAt && (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                      {new Date(room.scheduledAt).toLocaleString()}
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      room.allowGuests
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                    }`}
                  >
                    {room.allowGuests ? "Guests allowed" : "Members only"}
                  </span>
                  {room.password && (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Password protected
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(room.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => copyLink(room.slug)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Copy link"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <Link
                    href={`/room/${room.slug}`}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Join
                  </Link>
                  <button
                    onClick={() => handleDelete(room.id)}
                    disabled={deletingId === room.id}
                    className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                    title="Delete room"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
