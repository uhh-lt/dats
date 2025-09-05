import { Stack } from "@mui/material";
import { useParams } from "react-router";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import ClassifierJobs from "./ClassifierJobs.tsx";
import ClassifierTable from "./ClassifierTable.tsx";

function Classifier() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  return (
    <>
      <ContentContainerLayout>
        <Stack height="100%" spacing={2}>
          <ClassifierTable projectId={projectId} />
          <ClassifierJobs projectId={projectId} />
        </Stack>
      </ContentContainerLayout>
    </>
  );
}

export default Classifier;
