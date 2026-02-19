import { createFileRoute } from "@tanstack/react-router";
import TagRecommendations from "../../../../../views/analysis/TagRecommendations/TagRecommendations.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/tag-recommendations")({
  component: TagRecommendations,
});
