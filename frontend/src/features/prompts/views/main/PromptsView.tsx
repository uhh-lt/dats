import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { getIconComponent, Icon } from "@components/icons";
import { Stack, Typography } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { PromptBlocksSidebar } from "./_components/PromptBlocksSidebar";
import { PromptEditor } from "./_components/PromptEditor";
import { PromptExplorer } from "./_components/PromptExplorer";
import { usePromptEditor } from "./_hooks/usePromptEditor";

const routeApi = getRouteApi("/_auth/project/$projectId/prompts");

/** The prompts of a project: explorer, editor with versions and preview, blocks and their settings. */
export function PromptsView() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const promptId = routeApi.useSearch({ select: (search) => search.promptId });
  const navigate = routeApi.useNavigate();
  const { promptsByProjectOptions } = routeApi.useRouteContext();
  const { data: promptMap } = useSuspenseQuery(promptsByProjectOptions);
  const prompts = useMemo(() => Object.values(promptMap), [promptMap]);
  const prompt = promptId !== undefined ? promptMap[promptId] : undefined;

  const handleSelect = useCallback(
    (id: number) => {
      navigate({ search: { promptId: id } });
    },
    [navigate],
  );
  const editor = usePromptEditor(projectId, prompt, handleSelect);

  return (
    <SidebarContentSidebarLayout
      leftSidebar={
        <PromptExplorer
          className="h100"
          projectId={projectId}
          prompts={prompts}
          selectedPromptId={promptId}
          onSelect={handleSelect}
        />
      }
      content={
        editor ? (
          <PromptEditor editor={editor} projectId={projectId} />
        ) : (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: "100%", p: 4 }}>
            {getIconComponent(Icon.PROMPT, { sx: { fontSize: 64, color: "text.secondary" } })}
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
      rightSidebar={editor ? <PromptBlocksSidebar editor={editor} projectId={projectId} /> : null}
    />
  );
}
