import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM } from "@core/filter";
import { Icon } from "@core/navigation";
import { ImageSimilaritySearchView, imageSimilaritySearchViewLoader } from "@features/search";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const imageSimilaritySearchSchema = z.object({
  searchQuery: z.string().default(""),
  [FILTER_PARAM]: z.string().default(""),
  [FILTER_EXPERT_MODE_PARAM]: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(false),
  topK: z.number().default(10),
  threshold: z.number().default(0),
});

export const Route = createFileRoute("/_auth/project/$projectId/imagesearch")({
  staticData: {
    tab: true,
    icon: Icon.IMAGE_SEARCH,
    getTitle: () => "Image Search",
  },
  validateSearch: zodValidator(imageSimilaritySearchSchema),
  loaderDeps: ({ search }) => ({
    searchQuery: search.searchQuery,
    searchFilter: search[FILTER_PARAM],
    topK: search.topK,
    threshold: search.threshold,
  }),
  loader: ({ context, params, deps }) =>
    imageSimilaritySearchViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      searchQuery: deps.searchQuery,
      searchFilter: deps.searchFilter,
      topK: deps.topK,
      threshold: deps.threshold,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load image search: {(error as Error).message}</div>,
  component: ImageSimilaritySearchView,
});
