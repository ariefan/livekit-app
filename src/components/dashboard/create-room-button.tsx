"use client";

import { useState } from "react";
import { CreateRoomModal } from "./create-room-modal";

export function CreateRoomButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
      >
        Create Room
      </button>
      <CreateRoomModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
