import { metadataQueries } from "@api/queries/metadataQueries";
import { sentenceSimilarityQueries } from "@api/queries/sentenceSimilarityQueries";
import { Icon } from "@components/icons";
import { deserializeFilterFromSearchParam, FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter } from "@core/filter";
import { SentenceSimilaritySearchView } from "@features/search";
import { SdocColumns } from "@models/SdocColumns";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const sentenceSearchSchema = z.object({
  searchQuery: z.string().default(""),
  [FILTER_PARAM]: z
    .custom<string | MyFilter<SdocColumns>>()
    .default("")
    .transform((value) => deserializeFilterFromSearchParam<SdocColumns>(value, "root")),
  [FILTER_EXPERT_MODE_PARAM]: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(false),
  topK: z.coerce.number().default(10),
  threshold: z.coerce.number().default(0),
});

export const Route = createFileRoute("/_auth/project/$projectId/sentencesearch")({
  staticData: {
    tab: true,
    icon: Icon.SENTENCE_SEARCH,
    getTitle: () => "Sentence Search",
  },
  validateSearch: zodValidator(sentenceSearchSchema),
  loaderDeps: ({ search }) => search,
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params, deps }) => ({
    sentenceSimilarityOptions: sentenceSimilarityQueries.search({
      projectId: params.projectId,
      searchQuery: deps.searchQuery,
      filter: deps[FILTER_PARAM],
      topK: deps.topK,
      threshold: deps.threshold,
    }),
    projectMetadataOptions: metadataQueries.byProject(params.projectId),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.projectMetadataOptions),
      context.queryClient.ensureQueryData(context.sentenceSimilarityOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: SentenceSimilaritySearchView,
});
