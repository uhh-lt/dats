import { Icon } from "@components/icons";
import { parseIdParam } from "@core/navigation";
import { experimentQueries, ExperimentView } from "@features/experiment-studio";
import { AgreementScoring } from "@models/AgreementScoring";
import { CircularProgress } from "@mui/material";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const experimentSearchSchema = z.object({
  // the run shown in the run overview
  runId: z.coerce.number().optional(),
  // the scoring of the scores in the run table
  scoring: z.nativeEnum(AgreementScoring).default(AgreementScoring.CONSTITUENTS),
});

export const Route = createFileRoute("/_auth/project/$projectId/experiments/$experimentId")({
  staticData: {
    tab: true,
    icon: Icon.EXPERIMENT,
    getTitle: ({ queryClient, params }) => {
      const experiments = queryClient.getQueryData(experimentQueries.byProject(Number(params.projectId)).queryKey);
      return `Experiment ${experiments?.[Number(params.experimentId)]?.name ?? ""}`;
    },
  },
  params: {
    parse: ({ experimentId }) => ({ experimentId: parseIdParam(experimentId) }),
  },
  validateSearch: zodValidator(experimentSearchSchema),
  context: ({ params }) => ({ experimentsByProjectOptions: experimentQueries.byProject(params.projectId) }),
  loader: async ({ context, params }) => {
    const experiments = await context.queryClient.ensureQueryData(context.experimentsByProjectOptions);
    if (!experiments[params.experimentId]) throw notFound();
  },
  pendingComponent: () => <CircularProgress />,
  component: ExperimentView,
});
