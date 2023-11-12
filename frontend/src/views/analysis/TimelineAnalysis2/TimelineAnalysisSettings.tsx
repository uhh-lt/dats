import InfoIcon from "@mui/icons-material/Info";
import { MenuItem, Stack, TextField } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import React from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";
import { DateGroupBy, DocType, MetaType } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice";

function TimelineAnalysisSettings() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectMetadata = ProjectHooks.useGetMetadata(projectId);
  const filteredProjectMetadata = projectMetadata.data?.filter(
    (metadata) => metadata.doctype === DocType.TEXT && metadata.metatype === MetaType.DATE,
  );

  // global client state (redux)
  const groupBy = useAppSelector((state) => state.timelineAnalysis.groupBy);
  const projectMetadataId = useAppSelector((state) => state.timelineAnalysis.projectMetadataId);
  const resultType = useAppSelector((state) => state.timelineAnalysis.resultType);
  const dispatch = useAppDispatch();

  // handlers (for ui)
  const handleGroupByChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(TimelineAnalysisActions.setGroupBy(event.target.value as DateGroupBy));
  };
  const handleChangeMetadataId = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(TimelineAnalysisActions.setProjectMetadataKey(parseInt(event.target.value)));
  };
  const handleChangeResultType = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(TimelineAnalysisActions.setResultType(event.target.value));
  };

  return (
    <Card className="myFlexContainer h100">
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
        <Stack spacing={3}>
          <TextField
            select
            fullWidth
            label={"Group by"}
            variant="outlined"
            value={groupBy}
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
            value={projectMetadataId}
            onChange={handleChangeMetadataId}
            helperText="Specify the metadata key that denotes the date of the documents."
            error={filteredProjectMetadata?.length === 0}
            disabled={filteredProjectMetadata?.length === 0}
          >
            {filteredProjectMetadata?.length === 0 ? (
              <MenuItem key={-1} value={-1}>
                <i>There is no DATE metadata for TEXT documents this project!</i>
              </MenuItem>
            ) : (
              <MenuItem key={-1} value={-1}>
                <i>None</i>
              </MenuItem>
            )}
            {filteredProjectMetadata?.map((metadata) => (
              <MenuItem key={metadata.key} value={metadata.id}>
                {metadata.key}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label={"Result type"}
            variant="outlined"
            value={resultType}
            onChange={handleChangeResultType}
            helperText="Specify the type of the results."
            disabled
          >
            <MenuItem value={"document"}>Document</MenuItem>
          </TextField>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default TimelineAnalysisSettings;
