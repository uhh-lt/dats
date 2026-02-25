import { CardContainer } from "@components/CardContainer";
import InfoIcon from "@mui/icons-material/Info";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import { useAppSelector } from "@plugins/redux";
import { useMemo } from "react";
import { TimelineAnalysisRead } from "../../../../../api/openapi/models/TimelineAnalysisRead";
import { TimelineAnalysisType } from "../../../../../api/openapi/models/TimelineAnalysisType";
import { BBoxAnnotationTableSimple } from "../../../../../core/bbox-annotation/table/BBoxAnnotationTableSimple";
import { SentenceAnnotationTableSimple } from "../../../../../core/sentence-annotation/table/SentenceAnnotationTableSimple";
import { SdocTableSimple } from "../../../../../core/source-document/table/SdocTableSimple";
import { SpanAnnotationTableSimple } from "../../../../../core/span-annotation/table/SpanAnnotationTableSimple";

interface TimeAnalysisProvenanceProps {
  timelineAnalysis: TimelineAnalysisRead;
}

export function TimeAnalysisProvenance({ timelineAnalysis }: TimeAnalysisProvenanceProps) {
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
    <CardContainer className="myFlexContainer h100">
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
        {timelineAnalysis.timeline_analysis_type === TimelineAnalysisType.DOCUMENT ? (
          <SdocTableSimple sdocIds={provenance} />
        ) : timelineAnalysis.timeline_analysis_type === TimelineAnalysisType.SENTENCE_ANNOTATION ? (
          <SentenceAnnotationTableSimple sentAnnoIds={provenance} />
        ) : timelineAnalysis.timeline_analysis_type === TimelineAnalysisType.SPAN_ANNOTATION ? (
          <SpanAnnotationTableSimple spanAnnoIds={provenance} />
        ) : timelineAnalysis.timeline_analysis_type === TimelineAnalysisType.BBOX_ANNOTATION ? (
          <BBoxAnnotationTableSimple bboxAnnoIds={provenance} />
        ) : (
          <div>Unknown Analysis Type</div>
        )}
      </CardContent>
    </CardContainer>
  );
}
