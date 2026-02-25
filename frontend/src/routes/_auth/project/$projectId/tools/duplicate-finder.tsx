import { createFileRoute } from "@tanstack/react-router";
import DuplicateFinder from "../../../../../features/duplicate-finder/views/main/DuplicateFinderView";

export const Route = createFileRoute("/_auth/project/$projectId/tools/duplicate-finder")({
  component: DuplicateFinder,
});
