import { createFileRoute } from "@tanstack/react-router";
import ImageSimilaritySearch from "../../../../features/search/ImageSearch/ImageSimilaritySearch";

export const Route = createFileRoute("/_auth/project/$projectId/imagesearch")({
  component: ImageSimilaritySearch,
});
