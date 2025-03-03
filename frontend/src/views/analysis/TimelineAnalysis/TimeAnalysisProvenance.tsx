import InfoIcon from "@mui/icons-material/Info";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import { useMemo } from "react";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import SdocTableSimple from "../../../components/SourceDocument/SdocTableSimple.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface TimeAnalysisProvenanceProps {
  timelineAnalysis: TimelineAnalysisRead;
}

function TimeAnalysisProvenance({ timelineAnalysis }: TimeAnalysisProvenanceProps) {
  // redux
  const date = useAppSelector((state) => state.timelineAnalysis.provenanceDate);
  const concept = useAppSelector((state) => state.timelineAnalysis.provenanceConcept);

  // compute provenance: a record of date -> concept -> sdocIds
  const provenanceData: Record<string, Record<string, number[]>> = useMemo(() => {
    const date2concept2sdocIds: Record<string, Record<string, number[]>> = {};
    timelineAnalysis.concepts.forEach((concept) => {
      concept.results.forEach((result) => {
        date2concept2sdocIds[result.date] = date2concept2sdocIds[result.date] || {};
        date2concept2sdocIds[result.date][concept.name] = result.data_ids;
      });
    });
    return date2concept2sdocIds;
  }, [timelineAnalysis]);

  const provenance = useMemo(() => {
    if (!date || !concept || !provenanceData[date] || !provenanceData[date][concept]) {
      return [];
    }

    return provenanceData[date][concept];
  }, [provenanceData, date, concept]);

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title={concept && date ? `Provenance for ${concept} in ${date}` : "Provenance"}
        subheader="Investigate the Timeline Analysis."
      />
      <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
        <SdocTableSimple sdocIds={provenance} />
      </CardContent>
    </Card>
  );
}

export default TimeAnalysisProvenance;
