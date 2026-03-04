import { DuplicateFinderView } from "@features/duplicate-finder";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/tools/duplicate-finder")({
  component: DuplicateFinderView,
});
