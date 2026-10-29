import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { getIconComponent, Icon } from "@components/icons";
import { Stack, Typography } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { PromptTemplateBlocksSidebar } from "./_components/PromptTemplateBlocksSidebar";
import { PromptTemplateEditor } from "./_components/PromptTemplateEditor";
import { PromptTemplateExplorer } from "./_components/PromptTemplateExplorer";
import { usePromptTemplateEditor } from "./_hooks/usePromptTemplateEditor";

const routeApi = getRouteApi("/_auth/project/$projectId/prompts");

/** The prompts of a project: explorer, editor with versions and preview, blocks and their settings. */
export function PromptTemplatesView() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const templateId = routeApi.useSearch({ select: (search) => search.templateId });
  const navigate = routeApi.useNavigate();
  const { promptTemplatesByProjectOptions } = routeApi.useRouteContext();
  const { data: templateMap } = useSuspenseQuery(promptTemplatesByProjectOptions);
  const templates = useMemo(() => Object.values(templateMap), [templateMap]);
  const template = templateId !== undefined ? templateMap[templateId] : undefined;

  const handleSelect = useCallback(
    (id: number) => {
      navigate({ search: { templateId: id } });
    },
    [navigate],
  );
  const editor = usePromptTemplateEditor(projectId, template, handleSelect);

  return (
    <SidebarContentSidebarLayout
      leftSidebar={
        <PromptTemplateExplorer
          className="h100"
          projectId={projectId}
          templates={templates}
          selectedTemplateId={templateId}
          onSelect={handleSelect}
        />
      }
      content={
        editor ? (
          <PromptTemplateEditor editor={editor} projectId={projectId} />
        ) : (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: "100%", p: 4 }}>
            {getIconComponent(Icon.PROMPT_TEMPLATE, { sx: { fontSize: 64, color: "text.secondary" } })}
            <Typography variant="h6">Prompts</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 560, textAlign: "center" }}>
              A prompt is written for one task in one language: blocks like {"<codes>"} or {"<examples>"} show what you
              select in the editor, {"<output-format>"} adds the answer instructions, and only {"<document>"} is filled
              in by a run. Every save creates a new version; older versions never change. Select a prompt on the left or
              create a new one.
            </Typography>
          </Stack>
        )
      }
      rightSidebar={editor ? <PromptTemplateBlocksSidebar editor={editor} projectId={projectId} /> : null}
    />
  );
}
