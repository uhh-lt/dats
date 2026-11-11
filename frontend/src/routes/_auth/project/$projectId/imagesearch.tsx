import { ensureRouteFeatureEnabled } from "@core/feature";
import { Icon } from "@components/icons";
import { FILTER_PARAM, searchParamFilterValidators } from "@core/filter";
import { projectMetadataQueries } from "@core/project-metadata";
import { ImageSimilaritySearchView, similaritySearchQueries } from "@features/search";
import { SdocColumns } from "@models/SdocColumns";
import { CircularProgress } from "@mui/material";
import { Feature } from "@models/Feature";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const imageSimilaritySearchSchema = z.object({
  searchQuery: z.string().default(""),
  ...searchParamFilterValidators<SdocColumns>(),
  topK: z.coerce.number().default(10),
  threshold: z.coerce.number().default(0),
});

export const Route = createFileRoute("/_auth/project/$projectId/imagesearch")({
  staticData: {
    tab: true,
    icon: Icon.IMAGE_SEARCH,
    getTitle: () => "Image Search",
    feature: Feature.IMAGE_SIMILARITY_SEARCH,
  },
  validateSearch: zodValidator(imageSimilaritySearchSchema),
  loaderDeps: ({ search }) => search,
  context: ({ params, deps }) => ({
    imageSimilaritySearchOptions: similaritySearchQueries.image({
      projectId: params.projectId,
      searchQuery: deps.searchQuery,
      filter: deps[FILTER_PARAM],
      topK: deps.topK,
      threshold: deps.threshold,
    }),
    projectMetadataOptions: projectMetadataQueries.byProject(params.projectId),
  }),
  loader: async ({ context, params, route }) => {
    if (!(await ensureRouteFeatureEnabled({ context, params, route }))) return;
    await Promise.all([
      context.queryClient.ensureQueryData(context.projectMetadataOptions),
      context.queryClient.ensureQueryData(context.imageSimilaritySearchOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: ImageSimilaritySearchView,
});
