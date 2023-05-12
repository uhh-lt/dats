import React from "react";
import { Box, List, ListItem, ListItemButton, Typography } from "@mui/material";
import UserHooks from "../../api/UserHooks";
import { useAuth } from "../../auth/AuthProvider";
import SdocHooks from "../../api/SdocHooks";
import { useNavigate } from "react-router-dom";
import LexicalSearchResultCard from "../search/SearchResults/Cards/LexicalSearchResultCard";
import { SourceDocumentRead } from "../../api/openapi";

function RecentActivity() {
  const { user } = useAuth();

  // router
  const navigate = useNavigate();

  // global server stat - react query
  const recentSdocIds = UserHooks.useGetRecentActivity(user.data?.id, 5);

  // events
  const handleClick = (sdoc: SourceDocumentRead) => {
    navigate(`../project/${sdoc.project_id}/search/doc/${sdoc.id}`);
  };

  return (
    <>
      {recentSdocIds.isLoading && <div>Loading!</div>}
      {recentSdocIds.isError && <div>Error: {recentSdocIds.error.message}</div>}
      {recentSdocIds.isSuccess && (
        <>
          <Typography variant={"h6"} paddingY={2}>
            Continue where you left
          </Typography>
          <Box sx={{ py: 2, overflowX: "auto" }}>
            {recentSdocIds.data.map((sdocId) => (
              <LexicalSearchResultCard key={sdocId} sdocId={sdocId} handleClick={handleClick} />
            ))}
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
