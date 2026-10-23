import { Icon } from "@components/icons";
import { TagRecommendationsView } from "@features/tag-recommendations";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/tag-recommendations")({
  staticData: {
    tab: true,
    icon: Icon.TAG_RECOMMENDATION,
    getTitle: () => "Tag Recommendations",
  },
  component: TagRecommendationsView,
});
