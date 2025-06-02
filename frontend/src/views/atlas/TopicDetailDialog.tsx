import { Box, Dialog, DialogContent, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import DATSDialogHeader from "../../components/MUI/DATSDialogHeader.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { RootState } from "../../store/store.ts";
import { AtlasActions } from "./atlasSlice.ts";
import DocAspectTable from "./DocAspectTable.tsx";
import TopicWordsCloud from "./TopicWordsCloud.tsx";

interface TopicDetailDialogProps {
  aspectId: number;
}

function TopicDetailDialog({ aspectId }: TopicDetailDialogProps) {
  // dialog feature
  const open = useAppSelector((state: RootState) => state.atlas.isTopicDialogOpen);
  const topicId = useAppSelector((state: RootState) => state.atlas.topicDialogTopicId);
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(AtlasActions.onCloseTopicDialog());
  };

  // get topic information
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);
  const topic = useMemo(() => {
    if (!vis.data) return null;
    return vis.data.topics.find((t) => t.id === topicId);
  }, [vis.data, topicId]);

  // maximize dialog
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <Dialog open={open && !!topic} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Topic Details"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
      />
      {topic && (
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Box>
              <Typography variant="h4" component="h1" color="primary.dark">
                {topic.name}
              </Typography>
              <Typography pt={1} color="textSecondary">
                {topic.description}
              </Typography>
            </Box>
            <Stack spacing={4} direction={"row"}>
              <Box width="360px" flexShrink={0}>
                <Stack height={40} alignItems="center" direction="row">
                  <Typography variant="button">Top Words</Typography>
                </Stack>
                <TopicWordsCloud width={360} height={390} topic={topic} />
              </Box>
              <Box flexGrow={1} flexBasis="0%" sx={{ maxWidth: "100%", overflow: "hidden" }}>
                <Stack height={40} alignItems="center" direction="row">
                  <Typography variant="button">Top Documents</Typography>
                </Stack>
                <DocAspectTable aspectId={aspectId} height={390} sdocIds={topic.top_docs || undefined} />
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default TopicDetailDialog;
