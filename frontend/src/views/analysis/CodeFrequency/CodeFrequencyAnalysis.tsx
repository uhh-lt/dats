import { Card, CardHeader, Grid, Portal, Stack, Typography } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useComputeCodeTree from "../../../components/Code/CodeExplorer/useComputeCodeTree.ts";
import UserSelectorMulti from "../../../components/User/UserSelectorMulti.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import CodeFrequencyView from "./CodeFrequencyView.tsx";
import CodeOccurrenceTable from "./CodeOccurrenceTable.tsx";

function CodeFrequencyAnalysis() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state (react-redux)
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // custom hook
  const { codeTree, allCodes } = useComputeCodeTree();

  // local state
  const [selectedCode, setSelectedCode] = useState<number>();

  // effects
  // reset selected code when selectedUserIds change
  useEffect(() => {
    setSelectedCode(undefined);
  }, [selectedUserIds]);

  return (
    <Grid container columnSpacing={1} className="h100" px={2} pt={2} bgcolor="grey.200">
      {codeTree ? (
        <>
          <Portal container={appBarContainerRef?.current}>
            <Typography variant="h6" color="inherit" component="div">
              Frequency Analysis
            </Typography>
          </Portal>
          <Grid item xs={6} className="h100" sx={{ overflowY: "auto", pr: 1, py: 1 }}>
            <Stack spacing={2}>
              <UserSelectorMulti
                projectId={projectId}
                userIds={selectedUserIds}
                onUserIdChange={setSelectedUserIds}
                title="User(s)"
                fullWidth
                sx={{ bgcolor: "background.paper" }}
              />
              {selectedUserIds.length === 0 ? (
                <Card variant="outlined">
                  <CardHeader title={`Select user(s) above!`} />
                </Card>
              ) : (
                <CodeFrequencyView
                  key={selectedUserIds.join(",")} // re-render when selectedUserIds change
                  projectId={projectId}
                  userIds={selectedUserIds}
                  data={codeTree}
                  setSelectedCode={setSelectedCode}
                />
              )}
            </Stack>
          </Grid>
          <Grid item xs={6} className="h100" sx={{ py: 1 }}>
            {selectedCode ? (
              <CodeOccurrenceTable projectId={projectId} codeId={selectedCode} userIds={selectedUserIds} />
            ) : (
              <Card className="h100" variant="outlined">
                <CardHeader title={`Click on a bar / slice to see occurrences!`} />
              </Card>
            )}
          </Grid>
        </>
      ) : allCodes.isError ? (
        <Grid item xs={12}>
          ERROR: {allCodes.error.message}
        </Grid>
      ) : (
        <Grid item xs={12}>
          Loading...
        </Grid>
      )}
    </Grid>
  );
}

export default CodeFrequencyAnalysis;
