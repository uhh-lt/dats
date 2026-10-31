import { UserRead } from "@models/UserRead";

/** Whom a run annotates as: an existing virtual user of the project, or a new one to create. */
export type AnnotateAsChoice = { userId: number } | { newName: string };

/** The first free name `<prefix>-Run<n>` among the virtual users, e.g. "LLM-Run3". */
export function suggestVirtualUserName(prefix: string, virtualUsers: UserRead[]): string {
  const names = new Set(virtualUsers.map((user) => user.first_name));
  let run = 1;
  while (names.has(`${prefix}-Run${run}`)) run++;
  return `${prefix}-Run${run}`;
}
