import { Box, Dialog, DialogContent, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import Markdown from "react-markdown";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import DocAspectTable from "../components/DocAspectTable.tsx";
import { PerspectivesActions } from "../perspectivesSlice.ts";
import ClusterWordCloud from "./ClusterWordCloud.tsx";
import RecomputeClusterDescriptionButton from "./RecomputeClusterDescriptionButton.tsx";

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

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={open && !!cluster} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Cluster Details"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      {cluster && (
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Typography variant="h4" component="h1" color="primary.dark">
                  {cluster.name}
                </Typography>
                <RecomputeClusterDescriptionButton aspectId={aspectId} clusterId={cluster.id} />
              </Stack>
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
