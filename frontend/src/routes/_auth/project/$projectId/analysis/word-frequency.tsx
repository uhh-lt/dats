import { Icon } from "@components/icons";
import { FILTER_PARAM, filterSearchParams, sortingModelSearchParam, toSorts } from "@core/filter";
import { wordFrequencyQueries, WordFrequencyView } from "@features/word-frequency-analysis";
import { WordFrequencyColumns } from "@models/WordFrequencyColumns";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const wordFrequencySearchSchema = z.object({
  ...filterSearchParams<WordFrequencyColumns>(),
  sortingModel: sortingModelSearchParam([{ id: "WF_WORD_FREQUENCY", desc: true }]),
  fetchSize: z.coerce.number().default(50),
});

export const Route = createFileRoute("/_auth/project/$projectId/analysis/word-frequency")({
  staticData: {
    tab: true,
    icon: Icon.WORD_FREQUENCY,
    getTitle: () => "Word Frequency",
  },
  validateSearch: zodValidator(wordFrequencySearchSchema),
  loaderDeps: ({ search }) => search,
  context: ({ params, deps }) => ({
    wordFrequencySearchOptions: wordFrequencyQueries.search({
      projectId: params.projectId,
      requestBody: { filter: deps[FILTER_PARAM], sorts: toSorts<WordFrequencyColumns>(deps.sortingModel) },
      pageSize: deps.fetchSize,
    }),
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureInfiniteQueryData(context.wordFrequencySearchOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: WordFrequencyView,
});
