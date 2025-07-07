import { Box, Dialog, DialogContent, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import DocAspectTable from "../components/DocAspectTable.tsx";
import { PerspectivesActions } from "../perspectivesSlice.ts";
import ClusterWordCloud from "./ClusterWordCloud.tsx";

interface ClusterDetailDialogProps {
  aspectId: number;
}

function ClusterDetailDialog({ aspectId }: ClusterDetailDialogProps) {
  // dialog feature
  const open = useAppSelector((state: RootState) => state.perspectives.isClusterDialogOpen);
  const clusterId = useAppSelector((state: RootState) => state.perspectives.clusterDialogClusterId);
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(PerspectivesActions.onCloseClusterDialog());
  };

  // get cluster information
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);
  const cluster = useMemo(() => {
    if (!vis.data) return null;
    return vis.data.clusters.find((t) => t.id === clusterId);
  }, [vis.data, clusterId]);

  // maximize dialog
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <Dialog open={open && !!cluster} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Cluster Details"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
      />
      {cluster && (
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Box>
              <Typography variant="h4" component="h1" color="primary.dark">
                {cluster.name}
              </Typography>
              <Typography pt={1} color="textSecondary">
                <Markdown>{cluster.description}</Markdown>
              </Typography>
            </Box>
            <Stack spacing={4} direction={"row"}>
              <Box width="360px" flexShrink={0}>
                <Stack height={40} alignItems="center" direction="row">
                  <Typography variant="button">Top Words</Typography>
                </Stack>
                <ClusterWordCloud width={360} height={390} cluster={cluster} />
              </Box>
              <Box flexGrow={1} flexBasis="0%" sx={{ maxWidth: "100%", overflow: "hidden" }}>
                <Stack height={40} alignItems="center" direction="row">
                  <Typography variant="button">Top Documents</Typography>
                </Stack>
                <DocAspectTable aspectId={aspectId} height={390} cluster={cluster} />
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default ClusterDetailDialog;
