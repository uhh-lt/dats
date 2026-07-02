import { DocType } from "@api/models/DocType";
import { Icon } from "@components/icons";
import { CodeFrequencyAnalysisView } from "@features/code-frequency-analysis";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const codeFrequencySearchSchema = z.object({
  selectedCode: z.coerce.number().optional(),
  selectedUserIds: z.array(z.coerce.number()).default([]),
  selectedDocTypes: z.array(z.nativeEnum(DocType)).default([]),
});

export const Route = createFileRoute("/_auth/project/$projectId/analysis/code-frequency")({
  staticData: {
    tab: true,
    icon: Icon.CODE_FREQUENCY,
    getTitle: () => "Code Frequency",
  },
  validateSearch: zodValidator(codeFrequencySearchSchema),
  component: CodeFrequencyAnalysisView,
});
