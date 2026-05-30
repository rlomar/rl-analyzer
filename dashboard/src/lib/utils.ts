export function cn(...inputs: (string | boolean | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}

export const rankColors: Record<string, string> = {
  Bronze: "#8d6e63",
  Silver: "#bdbdbd",
  Gold: "#ffb300",
  Platinum: "#26a69a",
  Diamond: "#1e88e5",
  Champion: "#8e24aa",
  "Grand Champion": "#d32f2f",
  "Supersonic Legend": "#7c4dff",
};

export const rankIcons: Record<string, string> = {
  Bronze: "🟤",
  Silver: "⚪",
  Gold: "🟡",
  Platinum: "🟢",
  Diamond: "🔵",
  Champion: "🟣",
  "Grand Champion": "🔴",
  "Supersonic Legend": "💜",
};

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
