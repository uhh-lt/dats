import { createFileRoute } from "@tanstack/react-router";
import DuplicateFinder from "../../../../../features/tools/DuplicateFinder/DuplicateFinder.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/tools/duplicate-finder")({
  component: DuplicateFinder,
});
