import { AppBar, Box, BoxProps, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import SdocHooks from "../../../api/SdocHooks";
import { useAuth } from "../../../auth/AuthProvider";
import MemoResults from "../../logbook/MemoResults";

interface MemoExplorerProps {
  sdocId: number | undefined;
  showToolbar?: boolean;
}

function MemoExplorer({ sdocId, showToolbar, ...props }: MemoExplorerProps & BoxProps) {
  // global client state (context)
  const { user } = useAuth();

  // queries
  // document Memo, span annotation memo, bbox memo
  const memos = SdocHooks.useGetRelatedMemos(sdocId, user.data?.id);

  const content = (
    <Box className="myFlexFillAllContainer" sx={{ p: 1 }}>
      {!sdocId ? (
        <>Please select a document from the Document Explorer :)</>
      ) : memos.isSuccess ? (
        <MemoResults
          memoIds={memos.data.map((memo) => memo.id)}
          noResultsText={`There are no memos for this document yet.`}
        />
      ) : memos.isError ? (
        <>{memos.error.message}</>
      ) : (
        <>Loading...</>
      )}
    </Box>
  );

  return (
    <Box className="h100 myFlexContainer" {...props}>
      {showToolbar && (
        <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
          <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
            <Typography variant="h6" color="inherit" component="div">
              Memo Explorer
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      {content}
    </Box>
  );
}

export default MemoExplorer;
