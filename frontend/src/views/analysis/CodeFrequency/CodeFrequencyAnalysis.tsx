import { Card, CardHeader, Stack } from "@mui/material";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import useComputeCodeTree from "../../../components/Code/CodeExplorer/useComputeCodeTree.ts";
import CardContainer from "../../../components/MUI/CardContainer.tsx";
import UserSelectorMulti from "../../../components/User/UserSelectorMulti.tsx";
import ContentContentLayout from "../../../layouts/ContentLayouts/ContentContentLayout.tsx";
import CodeFrequencyView from "./CodeFrequencyView.tsx";
import CodeOccurrenceTable from "./CodeOccurrenceTable.tsx";
import DocTypeSelector from "./DocTypeSelector.tsx";

function CodeFrequencyAnalysis() {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // custom hook
  const { codeTree } = useComputeCodeTree();

  // local state
  const [selectedCode, setSelectedCode] = useState<number>();
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedDocTypes, setSelectedDocTypes] = useState<DocType[]>([]);

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
            <CodeFrequencyView
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

export default CodeFrequencyAnalysis;
