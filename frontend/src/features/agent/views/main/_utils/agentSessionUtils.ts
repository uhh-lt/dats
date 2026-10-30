import { AgentSessionRead } from "@models/AgentSessionRead";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const sessionGroup = (updated: Date, now: Date) => {
  const days = Math.round((startOfDay(now) - startOfDay(updated)) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  if (days < 30) return "Previous 30 days";
  return "Older";
};

/** The sessions (most recently updated first) grouped like "Today", "Yesterday", ..., keeping their order. */
export const groupSessionsByDate = (sessions: AgentSessionRead[], now: Date) => {
  const groups: { label: string; sessions: AgentSessionRead[] }[] = [];
  for (const session of sessions) {
    const label = sessionGroup(new Date(session.updated), now);
    const group = groups.at(-1);
    if (group?.label === label) group.sessions.push(session);
    else groups.push({ label, sessions: [session] });
  }
  return groups;
};

/** The time of today's sessions, the date of older ones. */
export const formatSessionTime = (updated: string, now: Date) => {
  const date = new Date(updated);
  if (startOfDay(date) === startOfDay(now)) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
