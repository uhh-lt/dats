import { createFileRoute } from "@tanstack/react-router";
import TagRecommendations from "../../../../../features/tag-recommendations/views/main/TagRecommendationsView";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/tag-recommendations")({
  component: TagRecommendations,
});
