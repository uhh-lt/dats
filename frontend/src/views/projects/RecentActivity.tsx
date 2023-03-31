import React from "react";
import { Box, List, ListItem, ListItemButton, Toolbar, Typography } from "@mui/material";
import UserHooks from "../../api/UserHooks";
import { useAuth } from "../../auth/AuthProvider";
import SdocHooks from "../../api/SdocHooks";

function RecentActivity() {
  const { user } = useAuth();
  const userAdocs = UserHooks.useGetAllAdocs(user.data?.id);
  const adocsSortedByUpdated = userAdocs.data!.sort((a, b) => {
    const aDate = Date.parse(a.updated);
    const bDate = Date.parse(b.updated);
    return aDate > bDate ? 1 : aDate < bDate ? -1 : 0;
  });

  return (
    <>
      {userAdocs.isLoading && <div>Loading!</div>}
      {userAdocs.isError && <div>Error: {userAdocs.error.message}</div>}
      {userAdocs.isSuccess && (
        <>
          <Toolbar sx={{ p: "0px !important" }}>
            <Typography variant={"h6"}>Continue where you left</Typography>
          </Toolbar>
          <Typography>Recent activity (past 7 days):</Typography>
          <Box style={{ height: "350", overflow: "auto" }}>
            <List>
              {adocsSortedByUpdated.map((adoc) => (
                <ListItem disablePadding>
                  <RecentActivityButton sdocId={adoc.source_document_id} updateTS={new Date(adoc.updated)} />
                </ListItem>
              ))}
            </List>
          </Box>
        </>
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

  return (
    <>
      {sdoc.isLoading && <div>Loading!</div>}
      {sdoc.isError && <div>Error: {sdoc.error.message}</div>}
      {sdoc.isSuccess && <ListItemButton>{`${sdoc.data.filename} | ${updateTS}`}</ListItemButton>}
    </>
  );
}

export default RecentActivity;
