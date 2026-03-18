import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM } from "@core/filter";
import { SentenceSimilaritySearchView, sentenceSimilaritySearchViewLoader } from "@features/search";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Icon } from "@utils/icons/iconUtils";
import { z } from "zod";

const sentenceSearchSchema = z.object({
  searchQuery: z.string().default(""),
  [FILTER_PARAM]: z.string().default(""),
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
  loaderDeps: ({ search }) => ({
    searchQuery: search.searchQuery,
    searchFilter: search[FILTER_PARAM],
    topK: search.topK,
    threshold: search.threshold,
  }),
  loader: ({ context, params, deps }) =>
    sentenceSimilaritySearchViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      searchQuery: deps.searchQuery,
      searchFilter: deps.searchFilter,
      topK: deps.topK,
      threshold: deps.threshold,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load sentence search: {(error as Error).message}</div>,
  component: SentenceSimilaritySearchView,
});
