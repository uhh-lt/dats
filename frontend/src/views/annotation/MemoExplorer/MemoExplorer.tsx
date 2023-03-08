import { AppBar, Paper, PaperProps, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useAuth } from "../../../auth/AuthProvider";
import MemoResults from "../../logbook/MemoResults";
import SdocHooks from "../../../api/SdocHooks";

interface MemoExplorerProps {
  sdocId: number | undefined;
  showToolbar?: boolean;
}

function MemoExplorer({ sdocId, showToolbar, ...props }: MemoExplorerProps & PaperProps) {
  // global client state (context)
  const { user } = useAuth();

  // queries
  // document Memo, span annotation memo, bbox memo
  const memos = SdocHooks.useGetRelatedMemos(sdocId, user.data?.id);

  const content = (
    <>
      {!sdocId ? (
        <div className="myFlexFillAllContainer">Please select a document from the Document Explorer :)</div>
      ) : memos.isSuccess ? (
        <div className="myFlexFillAllContainer">
          <MemoResults
            memoIds={memos.data.map((memo) => memo.id)}
            noResultsText={`There are no memos for this document yet.`}
          />
        </div>
      ) : memos.isError ? (
        <>{memos.error.message}</>
      ) : (
        "Loading..."
      )}
    </>
  );

  return (
    <>
      {showToolbar ? (
        <Paper square className="myFlexContainer" {...props} elevation={1}>
          <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
            <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
              <Typography variant="h6" color="inherit" component="div">
                Memo Explorer
              </Typography>
            </Toolbar>
          </AppBar>
          {content}
        </Paper>
      ) : (
        <>{content}</>
      )}
    </>
  );
}

export default MemoExplorer;
