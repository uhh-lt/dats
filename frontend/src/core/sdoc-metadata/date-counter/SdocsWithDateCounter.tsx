import { useCountSdocsWithDateMetadataQuery } from "./useCountSdocsWithDateMetadataQuery.ts";

interface SdocsWithDateCounterProps {
  projectId: number;
  dateMetadataId: number;
}

export function SdocsWithDateCounter({ projectId, dateMetadataId }: SdocsWithDateCounterProps) {
  // global server state (react-query)
  const validDocumentsCheck = useCountSdocsWithDateMetadataQuery(projectId, dateMetadataId);

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
