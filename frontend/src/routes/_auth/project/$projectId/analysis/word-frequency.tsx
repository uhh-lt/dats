import { Icon } from "@components/icons";
import {
  deserializeFilterFromSearchParam,
  FILTER_EXPERT_MODE_PARAM,
  FILTER_PARAM,
  MyFilter,
  toSorts,
} from "@core/filter";
import { wordFrequencyQueries, WordFrequencyView } from "@features/word-frequency-analysis";
import { WordFrequencyColumns } from "@models/WordFrequencyColumns";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const wordFrequencySearchSchema = z.object({
  [FILTER_PARAM]: z
    .custom<string | MyFilter<WordFrequencyColumns>>()
    .default("")
    .transform((value) => deserializeFilterFromSearchParam<WordFrequencyColumns>(value, "root")),
  [FILTER_EXPERT_MODE_PARAM]: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(false),
  sortingModel: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      }),
    )
    .default([
      {
        id: "WF_WORD_FREQUENCY",
        desc: true,
      },
    ]),
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
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params, deps }) => ({
    wordFrequencyTableOptions: wordFrequencyQueries.search({
      projectId: params.projectId,
      requestBody: { filter: deps[FILTER_PARAM], sorts: toSorts<WordFrequencyColumns>(deps.sortingModel) },
      pageSize: deps.fetchSize,
    }),
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureInfiniteQueryData(context.wordFrequencyTableOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: WordFrequencyView,
});
