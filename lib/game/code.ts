const LOOKALIKES: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
  І: "I",
};

export function normalizeRoomCode(raw: string): string {
  const upper = raw.toUpperCase().replace(/\s+/g, "");
  const latin = [...upper].map((char) => LOOKALIKES[char] ?? char).join("");
  return latin.replace(/[^A-Z0-9]/g, "").slice(0, 4);
}
