import { Card, Stack } from "@mui/material";
import { useParams } from "react-router";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import ClassifierDialog from "./ClassifierDialog.tsx";
import ClassifierJobs from "./ClassifierJobs.tsx";
import ClassifierTable from "./ClassifierTable.tsx";

function Classifier() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  return (
    <>
      <ContentContainerLayout>
        <Stack height="100%" spacing={2}>
          <Card sx={{ height: "100%" }} variant="outlined">
            <ClassifierTable projectId={projectId} sx={{ height: "100%" }} />
          </Card>
          <ClassifierJobs projectId={projectId} />
        </Stack>
      </ContentContainerLayout>
      <ClassifierDialog />
    </>
  );
}

export default Classifier;
