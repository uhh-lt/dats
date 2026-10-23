import { Icon } from "@components/icons";
import { FILTER_PARAM, searchParamFilterValidators } from "@core/filter";
import { projectMetadataQueries } from "@core/project-metadata";
import { similaritySearchQueries, SentenceSimilaritySearchView } from "@features/search";
import { SdocColumns } from "@models/SdocColumns";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const sentenceSearchSchema = z.object({
  searchQuery: z.string().default(""),
  ...searchParamFilterValidators<SdocColumns>(),
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
  context: ({ params, deps }) => ({
    sentenceSimilaritySearchOptions: similaritySearchQueries.sentence({
      projectId: params.projectId,
      searchQuery: deps.searchQuery,
      filter: deps[FILTER_PARAM],
      topK: deps.topK,
      threshold: deps.threshold,
    }),
    projectMetadataOptions: projectMetadataQueries.byProject(params.projectId),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.projectMetadataOptions),
      context.queryClient.ensureQueryData(context.sentenceSimilaritySearchOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: SentenceSimilaritySearchView,
});
