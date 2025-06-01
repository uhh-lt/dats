import { Box, Card, CardActionArea, CardContent, CardMedia, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { AspectRead } from "../../api/openapi/models/AspectRead.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import BackgroundJobStatusBadge from "./BackgroundJobStatusBadge.tsx";

interface MapCardProps {
  aspect: AspectRead;
  title: string;
  to: string;
}

function MapCard({ aspect, to, title }: MapCardProps) {
  const tmJob = TopicModellingHooks.usePollTMJob(aspect.most_recent_job_id, undefined);

  return (
    <Card sx={{ width: 360, flexShrink: 0, position: "relative" }}>
      <Box position={"absolute"} top={8} right={8} zIndex={1}>
        <BackgroundJobStatusBadge status={tmJob.data?.status} />
      </Box>
      <CardActionArea component={Link} to={to}>
        <CardMedia
          component="img"
          image={`/content/projects/${aspect.project_id}/plots/aspect_${aspect.id}_map_thumbnail.png`}
          title="Atlas Map Preview"
        />
        <CardContent sx={{ py: 0.5, pb: "4px !important", borderTop: "1px solid", borderColor: "grey.300" }}>
          <Typography variant="subtitle1" fontWeight="800" color="textSecondary">
            {title}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default MapCard;
