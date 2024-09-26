import InfoIcon from "@mui/icons-material/Info";
import { Card, CardActionArea, CardContent, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import SdocHooks from "../../api/SdocHooks.ts";
import UserHooks from "../../api/UserHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";

function RecentActivity() {
  const { user } = useAuth();

  // global server stat - react query
  const recentSdocIds = UserHooks.useGetRecentActivity(user?.id, 5);

  return (
    <>
      <Toolbar sx={{ p: "0px !important" }}>
        <Typography variant="h6">Recent Activity</Typography>
        <Tooltip title="Recently annotated documents">
          <InfoIcon sx={{ ml: 1 }} />
        </Tooltip>
      </Toolbar>
      {recentSdocIds.isLoading && <div>Loading!</div>}
      {recentSdocIds.isError && <div>Error: {recentSdocIds.error.message}</div>}
      {recentSdocIds.isSuccess && (
        <Stack rowGap={1}>
          {recentSdocIds.data.map((sdocId) => (
            <RecentActivityCard key={sdocId} sdocId={sdocId} />
          ))}
        </Stack>
      )}
    </>
  );
}

interface RecentActivityButtonProps {
  sdocId: number;
}

function RecentActivityCard({ sdocId }: RecentActivityButtonProps) {
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
          <CardActionArea onClick={() => navigate(`../project/${sdoc.data.project_id}/annotation/${sdocId}`)}>
            <CardContent>
              <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                {project.data.title}
              </Typography>
              <Typography variant="h5" component="div">
                {sdoc.data.filename}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      )}
    </>
  );
}

export default RecentActivity;
