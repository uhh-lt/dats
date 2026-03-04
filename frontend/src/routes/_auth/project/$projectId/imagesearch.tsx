import { ImageSimilaritySearchView } from "@features/search";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/imagesearch")({
  component: ImageSimilaritySearchView,
});
