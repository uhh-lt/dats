import { CardContainer } from "@components/CardContainer";
import { ContentContentLayout } from "@components/content-layouts";
import { useComputeCodeTree } from "@core/code";
import { DocTypeSelector } from "@core/source-document";
import { UserSelectorMulti } from "@core/user";
import { useURLConnector } from "@hooks/useURLConnector";
import { Card, CardHeader, Stack } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { CodeFrequencyPlot } from "./_components/CodeFrequencyPlot";
import { CodeOccurrenceTable } from "./_components/CodeOccurrenceTable";

const CodeFrequencyRouteApi = getRouteApi("/_auth/project/$projectId/analysis/code-frequency");

export function CodeFrequencyAnalysisView() {
  // global client state (react-router)
  const projectId = CodeFrequencyRouteApi.useParams({ select: (params) => params.projectId });

  // custom hook
  const { codeTree } = useComputeCodeTree();

  // global client state (URL)
  const [selectedCode, setSelectedCode] = useURLConnector(CodeFrequencyRouteApi, "selectedCode");
  const [selectedUserIds, setSelectedUserIds] = useURLConnector(CodeFrequencyRouteApi, "selectedUserIds");
  const [selectedDocTypes, setSelectedDocTypes] = useURLConnector(CodeFrequencyRouteApi, "selectedDocTypes");

  return (
    <ContentContentLayout
      leftContent={
        <Stack spacing={2} p={2}>
          <Stack direction="row" gap={2}>
            <UserSelectorMulti
              userIds={selectedUserIds}
              onUserIdChange={setSelectedUserIds}
              title="User(s)"
              fullWidth
              sx={{ bgcolor: "background.paper" }}
            />
            <DocTypeSelector
              multiple
              docTypes={selectedDocTypes}
              onDocTypeChange={setSelectedDocTypes}
              title="Modalities"
              fullWidth
              sx={{ bgcolor: "background.paper" }}
            />
          </Stack>
          {selectedUserIds.length === 0 || selectedDocTypes.length === 0 ? (
            <Card variant="outlined">
              <CardHeader title={`Select user(s) and modalities above!`} />
            </Card>
          ) : codeTree === null ? (
            <Card variant="outlined">
              <CardHeader title={`No data available!`} />
            </Card>
          ) : (
            <CodeFrequencyPlot
              key={codeTree.model.data.id}
              projectId={projectId}
              userIds={selectedUserIds}
              docTypes={selectedDocTypes}
              data={codeTree}
              setSelectedCode={setSelectedCode}
            />
          )}
        </Stack>
      }
      rightContent={
        <>
          {selectedCode ? (
            <CodeOccurrenceTable projectId={projectId} codeId={selectedCode} userIds={selectedUserIds} />
          ) : (
            <CardContainer className="h100">
              <CardHeader title={`Click on a bar / slice to see occurrences!`} />
            </CardContainer>
          )}
        </>
      }
    />
  );
}
