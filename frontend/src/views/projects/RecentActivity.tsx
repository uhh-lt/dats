import { Box, List, ListItem, ListItemButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks";
import UserHooks from "../../api/UserHooks";
import { useAuth } from "../../auth/AuthProvider";

function RecentActivity() {
  const { user } = useAuth();

  // global server stat - react query
  const recentAdocs = UserHooks.useGetRecentActivity(user.data?.id, 5);

  return (
    <>
      {recentAdocs.isLoading && <div>Loading!</div>}
      {recentAdocs.isError && <div>Error: {recentAdocs.error.message}</div>}
      {recentAdocs.isSuccess && (
        <Box style={{ maxHeight: "200px", overflow: "auto" }}>
          <List disablePadding>
            {recentAdocs.data.map((adoc) => (
              <ListItem disablePadding>
                <RecentActivityButton sdocId={adoc.source_document_id} updateTS={new Date(adoc.updated)} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </>
  );
}

interface RecentActivityButtonProps {
  sdocId: number;
  updateTS: Date;
}

function RecentActivityButton({ sdocId, updateTS }: RecentActivityButtonProps) {
  // router
  const navigate = useNavigate();

  // global server stat - react query
  const sdoc = SdocHooks.useGetDocument(sdocId);

  return (
    <>
      {sdoc.isLoading && <div>Loading!</div>}
      {sdoc.isError && <div>Error: {sdoc.error.message}</div>}
      {sdoc.isSuccess && (
        <ListItemButton onClick={() => navigate(`../project/${sdoc.data.project_id}/search/doc/${sdocId}`)}>{`${
          sdoc.data.filename
        } | ${updateTS.toLocaleTimeString()} ${updateTS.toDateString()}`}</ListItemButton>
      )}
    </>
  );
}

export default RecentActivity;
