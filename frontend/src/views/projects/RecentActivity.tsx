import InfoIcon from "@mui/icons-material/Info";
import { Card, CardActionArea, CardContent, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import SdocHooks from "../../api/SdocHooks";
import UserHooks from "../../api/UserHooks";
import { useAuth } from "../../auth/AuthProvider";

function RecentActivity() {
  const { user } = useAuth();

  // global server stat - react query
  const recentAdocs = UserHooks.useGetRecentActivity(user.data?.id, 5);

  return (
    <>
      <Toolbar sx={{ p: "0px !important" }}>
        <Typography variant="h6">Recent Activity</Typography>
        <Tooltip title="Recently annotated documents">
          <InfoIcon sx={{ ml: 1 }} />
        </Tooltip>
      </Toolbar>
      {recentAdocs.isLoading && <div>Loading!</div>}
      {recentAdocs.isError && <div>Error: {recentAdocs.error.message}</div>}
      {recentAdocs.isSuccess && (
        <Stack rowGap={1}>
          {recentAdocs.data.map((adoc) => (
            <RecentActivityCard key={adoc.id} sdocId={adoc.source_document_id} updateTS={new Date(adoc.updated)} />
          ))}
        </Stack>
      )}
    </>
  );
}

interface RecentActivityButtonProps {
  sdocId: number;
  updateTS: Date;
}

function RecentActivityCard({ sdocId, updateTS }: RecentActivityButtonProps) {
  // router
  const navigate = useNavigate();

  // global server stat - react query
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const project = ProjectHooks.useGetProject(sdoc.data?.project_id);

  return (
    <>
      {sdoc.isLoading && <div>Loading!</div>}
      {sdoc.isError && <div>Error: {sdoc.error.message}</div>}
      {sdoc.isSuccess && project.isSuccess && (
        <Card variant="outlined">
          <CardActionArea onClick={() => navigate(`../project/${sdoc.data.project_id}/search/doc/${sdocId}`)}>
            <CardContent>
              <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                {project.data.title}
              </Typography>
              <Typography variant="h5" component="div">
                {sdoc.data.filename}
              </Typography>
              <Typography sx={{ fontSize: 14 }} color="text.secondary">
                {`${updateTS.toLocaleTimeString()} ${updateTS.toDateString()}`}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      )}
    </>
  );
}

export default RecentActivity;
