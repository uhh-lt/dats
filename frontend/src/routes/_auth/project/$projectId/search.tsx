import { createFileRoute } from "@tanstack/react-router";
import Search from "../../../../views/search/DocumentSearch/Search.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/search")({
  component: Search,
});
