import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { useTimelineAnalysisCheckQuery } from "./useTimelineAnalysisCheckQuery.ts";

interface ValidDocumentsCheckerProps {
  projectId: number;
}

function ValidDocumentsChecker({ projectId }: ValidDocumentsCheckerProps) {
  // global client state (redux)
  const dateMetadataId = useAppSelector((state) => state.timelineAnalysis.projectMetadataId);

  // global server state (react-query)
  const validDocumentsCheck = useTimelineAnalysisCheckQuery(projectId, dateMetadataId);

  if (dateMetadataId === -1 || validDocumentsCheck.isLoading) {
    return <>Specify the metadata key that denotes the date of the document.</>;
  } else if (validDocumentsCheck.isError) {
    return <>{validDocumentsCheck.error}</>;
  } else if (validDocumentsCheck.isSuccess) {
    return (
      <>
        {validDocumentsCheck.data[0]} / {validDocumentsCheck.data[1]} documents have a valid date.
      </>
    );
  } else {
    return null;
  }
}

export default ValidDocumentsChecker;
