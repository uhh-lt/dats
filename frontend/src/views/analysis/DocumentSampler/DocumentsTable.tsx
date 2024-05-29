import { CardProps } from "@mui/material";
import SimpleSdocTable from "../../../components/DocumentTable/SimpleSdocTable.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import BulkDocTagger from "./BulkDocTagger.tsx";
import DataCard from "./DataCard.tsx";

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
      cardContentProps={{ sx: { padding: "0 !important" } }}
      renderData={(chartData) => (
        <SimpleSdocTable
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
