// Generate a random slug like "abc-def-ghi"
export function generateRoomSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const segments = 3;
  const segmentLength = 3;

  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    parts.push(segment);
  }

  return parts.join("-");
}
