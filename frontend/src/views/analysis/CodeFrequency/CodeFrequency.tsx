import { useParams } from "react-router-dom";
import { CodeStatistics, useGetCodeStatisticTree } from "./useGetCodeStatisticTree";

interface CodeFrequencyProps {}

function CodeFrequency({}: CodeFrequencyProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // custom hook
  const data = useGetCodeStatisticTree(projectId);

  return (
    <div>
      {data.isSuccess ? (
        <CodeFrequencyView data={data.data} />
      ) : data.isError ? (
        <div>ERROR: {data.error.message}</div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}

function CodeFrequencyView({ data }: { data: CodeStatistics }) {
  return (
    <div>
      <div>Code</div>
      <div>Frequency</div>
    </div>
  );
}

export default CodeFrequency;
