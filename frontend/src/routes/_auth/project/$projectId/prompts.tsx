import { Icon } from "@components/icons";
import { promptQueries } from "@core/prompt";
import { PromptsView } from "@features/prompts";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const promptsSearchSchema = z.object({
  // the prompt opened in the editor
  promptId: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/prompts")({
  staticData: {
    tab: true,
    icon: Icon.PROMPT,
    getTitle: () => "Prompts",
  },
  validateSearch: zodValidator(promptsSearchSchema),
  context: ({ params }) => ({
    promptsByProjectOptions: promptQueries.byProject(params.projectId),
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.promptsByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: PromptsView,
});
