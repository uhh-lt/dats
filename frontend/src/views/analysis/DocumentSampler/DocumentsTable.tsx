import { CardProps } from "@mui/material";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import BulkDocTagger from "./BulkDocTagger";
import DataCard from "./DataCard";
import SdocTable from "./SdocTable";

interface DocumentsTableProps {
  cardProps?: CardProps;
  onTableRefresh: () => void;
}

function DocumentsTable({ cardProps, onTableRefresh }: DocumentsTableProps) {
  const isFixedSamplingStrategy = useAppSelector((state) => state.documentSampler.isFixedSamplingStrategy);

  return (
    <DataCard
      title="Sampled documents table"
      description="Document sampled from the document data with chosen strategy"
      action={<BulkDocTagger />}
      onDataRefresh={onTableRefresh}
      cardProps={cardProps}
      cardContentProps={{ sx: { padding: 0 } }}
      renderData={(chartData) => (
        <SdocTable
          sdocIds={chartData
            .map((chartDatum) =>
              isFixedSamplingStrategy ? chartDatum.fixedSampleSdocIds : chartDatum.relativeSampleSdocIds,
            )
            .flat()}
        />
      )}
    />
  );
}

export default DocumentsTable;
