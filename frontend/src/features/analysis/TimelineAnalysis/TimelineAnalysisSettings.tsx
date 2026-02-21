import InfoIcon from "@mui/icons-material/Info";
import { CircularProgress, MenuItem, Stack, TextField } from "@mui/material";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import { ChangeEvent } from "react";
import { MetadataHooks } from "../../../api/MetadataHooks.ts";
import { TimelineAnalysisHooks } from "../../../api/TimelineAnalysisHooks.ts";
import { DateGroupBy } from "../../../api/openapi/models/DateGroupBy.ts";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { MetaType } from "../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { TAAnnotationAggregationType } from "../../../api/openapi/models/TAAnnotationAggregationType.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisType } from "../../../api/openapi/models/TimelineAnalysisType.ts";
import { CardContainer } from "../../../components/MUI/CardContainer.tsx";
import { SdocsWithDateCounter } from "../../../core/sdoc-metadata/date-counter/SdocsWithDateCounter.tsx";

const aggregationType2HumanReadable: Record<TimelineAnalysisType, Record<TAAnnotationAggregationType, string>> = {
  [TimelineAnalysisType.DOCUMENT]: {
    [TAAnnotationAggregationType.UNIT]: "NA",
    [TAAnnotationAggregationType.ANNOTATION]: "NA",
    [TAAnnotationAggregationType.DOCUMENT]: "NA",
  },
  [TimelineAnalysisType.SENTENCE_ANNOTATION]: {
    [TAAnnotationAggregationType.UNIT]: "Count sentences",
    [TAAnnotationAggregationType.ANNOTATION]: "Count sentence annotations",
    [TAAnnotationAggregationType.DOCUMENT]: "Count documents",
  },
  [TimelineAnalysisType.SPAN_ANNOTATION]: {
    [TAAnnotationAggregationType.UNIT]: "Count words",
    [TAAnnotationAggregationType.ANNOTATION]: "Count span annotations",
    [TAAnnotationAggregationType.DOCUMENT]: "Count documents",
  },
  [TimelineAnalysisType.BBOX_ANNOTATION]: {
    [TAAnnotationAggregationType.UNIT]: "Count bbpx annotations",
    [TAAnnotationAggregationType.ANNOTATION]: "Count bbox annotations",
    [TAAnnotationAggregationType.DOCUMENT]: "Count documents",
  },
};

interface TimelineAnalysisSettingsProps {
  timelineAnalysis: TimelineAnalysisRead;
}

export function TimelineAnalysisSettings({ timelineAnalysis }: TimelineAnalysisSettingsProps) {
  // global server state (react-query)
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();
  const filteredProjectMetadata = projectMetadata.data?.filter(
    (metadata) => metadata.doctype === DocType.TEXT && metadata.metatype === MetaType.DATE,
  );

  return (
    <CardContainer className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title="Settings"
        subheader="Adjust the visualization settings"
      />
      <CardContent className="myFlexFillAllContainer">
        {filteredProjectMetadata ? (
          <TimelineAnalysisSettingsContent
            timelineAnalysis={timelineAnalysis}
            projectMetadata={filteredProjectMetadata}
          />
        ) : projectMetadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>Failed to load metadata</div>
        )}
      </CardContent>
    </CardContainer>
  );
}

function TimelineAnalysisSettingsContent({
  timelineAnalysis,
  projectMetadata,
}: TimelineAnalysisSettingsProps & { projectMetadata: ProjectMetadataRead[] }) {
  // handlers (for ui)
  const updateTimelineAnalysisMutation = TimelineAnalysisHooks.useUpdateTimelineAnalysis();
  const handleGroupByChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        settings: {
          ...timelineAnalysis.settings,
          group_by: event.target.value as DateGroupBy,
        },
      },
    });
  };
  const handleChangeMetadataId = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        settings: {
          ...timelineAnalysis.settings,
          date_metadata_id: value === -1 ? null : value,
        },
      },
    });
  };
  const handleAnnotationAggregationTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (timelineAnalysis.timeline_analysis_type === TimelineAnalysisType.DOCUMENT) return;
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        settings: {
          ...timelineAnalysis.settings,
          annotation_aggregation_type: event.target.value as TAAnnotationAggregationType,
        },
      },
    });
  };

  return (
    <Stack spacing={3}>
      <TextField
        select
        fullWidth
        label={"Group by"}
        variant="outlined"
        value={timelineAnalysis.settings.group_by}
        onChange={handleGroupByChange}
        helperText="Specify the aggregation of the results."
      >
        {Object.values(DateGroupBy).map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        fullWidth
        label={"Date metadata"}
        variant="outlined"
        value={timelineAnalysis.settings.date_metadata_id || -1}
        onChange={handleChangeMetadataId}
        helperText={
          <SdocsWithDateCounter
            projectId={timelineAnalysis.project_id}
            dateMetadataId={timelineAnalysis.settings.date_metadata_id || -1}
          />
        }
        error={projectMetadata.length === 0}
        disabled={projectMetadata.length === 0}
      >
        {projectMetadata.length === 0 ? (
          <MenuItem key={-1} value={-1}>
            <i>There is no DATE metadata for TEXT documents this project!</i>
          </MenuItem>
        ) : (
          <MenuItem key={-1} value={-1}>
            <i>None</i>
          </MenuItem>
        )}
        {projectMetadata.map((metadata) => (
          <MenuItem key={metadata.key} value={metadata.id}>
            {metadata.key}
          </MenuItem>
        ))}
      </TextField>

      {timelineAnalysis.timeline_analysis_type !== TimelineAnalysisType.DOCUMENT && (
        <TextField
          select
          fullWidth
          label={"Annotation aggregation"}
          variant="outlined"
          value={timelineAnalysis.settings.annotation_aggregation_type}
          onChange={handleAnnotationAggregationTypeChange}
          helperText="Specify the aggregation of the annotations."
        >
          {Object.values(TAAnnotationAggregationType).map((value) => (
            <MenuItem key={value} value={value}>
              {aggregationType2HumanReadable[timelineAnalysis.timeline_analysis_type][value]}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}
