import { UserRead } from "@models/UserRead";

/** Whom a run annotates as: an existing virtual annotator of the project, or a new one to create. */
export type AnnotateAsChoice = { userId: number } | { newName: string };

/** The first free name `<prefix>-Run<n>` among the virtual annotators, e.g. "LLM-Run3". */
export function suggestVirtualAnnotatorName(prefix: string, virtualAnnotators: UserRead[]): string {
  const names = new Set(virtualAnnotators.map((annotator) => annotator.first_name));
  let run = 1;
  while (names.has(`${prefix}-Run${run}`)) run++;
  return `${prefix}-Run${run}`;
}
