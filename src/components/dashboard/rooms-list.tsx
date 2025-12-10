"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2 } from "lucide-react";

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

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (rooms.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-12 text-center">
        <div className="text-muted-foreground mb-4">
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
        <p className="text-muted-foreground">
          Create your first room to start hosting meetings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Room
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rooms.map((room) => (
            <tr key={room.id} className="hover:bg-muted/30">
              <td className="px-6 py-4">
                <div>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {room.slug}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {room.isScheduled && room.scheduledAt && (
                    <Badge className="bg-purple-600 hover:bg-purple-600 text-white">
                      {formatDateTime(room.scheduledAt)}
                    </Badge>
                  )}
                  <Badge
                    className={
                      room.allowGuests
                        ? "bg-green-600 hover:bg-green-600 text-white"
                        : "bg-yellow-600 hover:bg-yellow-600 text-white"
                    }
                  >
                    {room.allowGuests ? "Guests allowed" : "Members only"}
                  </Badge>
                  {room.password && (
                    <Badge variant="secondary">
                      Password protected
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {formatDateTime(room.createdAt)}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyLink(room.slug)}
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/room/${room.slug}`}>Join</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(room.id)}
                    disabled={deletingId === room.id}
                    className="text-destructive hover:text-destructive"
                    title="Delete room"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
