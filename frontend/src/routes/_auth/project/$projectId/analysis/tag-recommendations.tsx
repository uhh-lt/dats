import { TagRecommendationsView } from "@features/tag-recommendations";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/tag-recommendations")({
  component: TagRecommendationsView,
});
