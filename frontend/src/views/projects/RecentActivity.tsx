import React from "react";
import { Box, List, ListItem, ListItemButton, Typography } from "@mui/material";
import UserHooks from "../../api/UserHooks";
import { useAuth } from "../../auth/AuthProvider";
import SdocHooks from "../../api/SdocHooks";
import { useNavigate } from "react-router-dom";

function RecentActivity() {
  const { user } = useAuth();
  const userAdocs = UserHooks.useGetAllAdocs(user.data?.id);
  const adocsSortedByUpdated = userAdocs.data?.sort((a, b) => {
    const aDate = Date.parse(a.updated);
    const bDate = Date.parse(b.updated);
    return aDate > bDate ? 1 : aDate < bDate ? -1 : 0;
  });

  return (
    <>
      {userAdocs.isLoading && <div>Loading!</div>}
      {userAdocs.isError && <div>Error: {userAdocs.error.message}</div>}
      {userAdocs.isSuccess && (
        <Box maxHeight={300}>
          <Typography variant={"h6"} paddingY={2}>
            Continue where you left
          </Typography>
          <Typography paddingBottom={2}>
            <b>Recent activity (past 7 days):</b>
          </Typography>
          <Box style={{ maxHeight: "200px", overflow: "auto" }}>
            <List disablePadding>
              {adocsSortedByUpdated!.map((adoc) => (
                <ListItem disablePadding style={{ width: 600 }}>
                  <RecentActivityButton sdocId={adoc.source_document_id} updateTS={new Date(adoc.updated)} />
                </ListItem>
              ))}
            </List>
          </Box>
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
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const navigate = useNavigate();

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
