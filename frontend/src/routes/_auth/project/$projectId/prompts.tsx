import { Icon } from "@components/icons";
import { promptTemplateQueries } from "@core/prompt-template";
import { PromptTemplatesView } from "@features/prompt-templates";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const promptTemplatesSearchSchema = z.object({
  // the template opened in the editor
  templateId: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_auth/project/$projectId/prompts")({
  staticData: {
    tab: true,
    icon: Icon.PROMPT_TEMPLATE,
    getTitle: () => "Prompts",
  },
  validateSearch: zodValidator(promptTemplatesSearchSchema),
  context: ({ params }) => ({
    promptTemplatesByProjectOptions: promptTemplateQueries.byProject(params.projectId),
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.promptTemplatesByProjectOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: PromptTemplatesView,
});
