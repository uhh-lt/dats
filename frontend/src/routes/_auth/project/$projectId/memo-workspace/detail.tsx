import { MemoDetailView } from "@features/memo-workspace";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const memoDetailSearchSchema = z.object({
  memoId: z.coerce.number().positive().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/memo-workspace/detail")({
  validateSearch: zodValidator(memoDetailSearchSchema),
  component: MemoDetailView,
});
