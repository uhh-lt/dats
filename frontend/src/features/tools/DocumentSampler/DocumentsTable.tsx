import { CardProps } from "@mui/material";
import { memo, useCallback } from "react";
import { SdocTableSimple } from "../../../core/source-document/table/SdocTableSimple.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { BulkDocTagger } from "./BulkDocTagger.tsx";
import { ChartDataPoint } from "./ChartDataPoint.ts";
import { DataCard } from "./DataCard.tsx";

interface DocumentsTableProps {
  cardProps?: CardProps;
  onTableRefresh: () => void;
}

export const DocumentsTable = memo(({ cardProps, onTableRefresh }: DocumentsTableProps) => {
  const isFixedSamplingStrategy = useAppSelector((state) => state.documentSampler.isFixedSamplingStrategy);

  // Memoize the render function to prevent unnecessary re-renders
  const renderData = useCallback(
    (chartData: ChartDataPoint[]) => (
      <SdocTableSimple
        sdocIds={chartData
          .map((chartDatum) =>
            isFixedSamplingStrategy ? chartDatum.fixedSampleSdocIds : chartDatum.relativeSampleSdocIds,
          )
          .flat()}
      />
    ),
    [isFixedSamplingStrategy],
  );

  return (
    <DataCard
      title="Sampled documents table"
      description="Document sampled from the document data with chosen strategy"
      action={<BulkDocTagger />}
      onDataRefresh={onTableRefresh}
      cardProps={cardProps}
      cardContentProps={{ sx: { padding: "0 !important" } }}
      renderData={renderData}
    />
  );
});
