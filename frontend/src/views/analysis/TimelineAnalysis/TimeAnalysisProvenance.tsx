import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import InfoIcon from "@mui/icons-material/Info";
import LaunchIcon from "@mui/icons-material/Launch";
import { ListItem, Tooltip, Typography } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TimelineAnalysisResult } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";

interface TimeAnalysisProvenanceProps {
  provenanceData: Record<string, Record<string, TimelineAnalysisResult[]>>;
}

function TimeAnalysisProvenance({ provenanceData }: TimeAnalysisProvenanceProps) {
  // redux
  const date = useAppSelector((state) => state.analysis.provenanceDate);
  const concept = useAppSelector((state) => state.analysis.provenanceConcept);

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
        title={`Provenance for ${concept} in ${date}`}
        subheader="Investigate the Timeline Analysis."
      />
      <CardContent className="myFlexFillAllContainer">
        <List sx={{ width: "100%", bgcolor: "background.paper" }}>
          {provenance.map((provenance, index) => (
            <CustomListItem key={index} provenance={provenance} />
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

interface CustomListItemProps {
  provenance: TimelineAnalysisResult;
}

function CustomListItem({ provenance }: CustomListItemProps) {
  return (
    <>
      <ListItem
        secondaryAction={
          <>
            <IconButton aria-label="edit" disabled>
              <CheckIcon />
            </IconButton>
            <IconButton aria-label="delete" disabled>
              <ClearIcon />
            </IconButton>
            <Tooltip title={"Open document"} enterDelay={500}>
              <Link to={`../search/doc/${provenance.sdoc_id}`}>
                <IconButton edge="end" aria-label="goto">
                  <LaunchIcon />
                </IconButton>
              </Link>
            </Tooltip>
          </>
        }
      >
        <Typography mr={2}>{(provenance.score * 100.0).toFixed(2)}%</Typography>
        <ListItemText sx={{ pr: 10 }} primary={provenance.sentence} secondary={provenance.context} />
      </ListItem>
    </>
  );
}

export default TimeAnalysisProvenance;
