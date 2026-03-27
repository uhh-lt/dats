import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { deserializeFilterFromSearchParam, FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter } from "@core/filter";
import { WordFrequencyView, wordFrequencyViewLoader } from "@features/word-frequency-analysis";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Icon } from "@utils/icons/iconUtils";
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
  loaderDeps: ({ search }) => ({
    searchFilter: search[FILTER_PARAM],
    sortingModel: search.sortingModel,
    fetchSize: search.fetchSize,
  }),
  loader: ({ context, params, deps }) =>
    wordFrequencyViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      searchFilter: deps.searchFilter,
      sortingModel: deps.sortingModel,
      fetchSize: deps.fetchSize,
    }),
  pendingComponent: () => <CircularProgress />,
  component: WordFrequencyView,
});
