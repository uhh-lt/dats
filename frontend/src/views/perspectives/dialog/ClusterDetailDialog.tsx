import { Close, Edit, Save } from "@mui/icons-material";
import { Box, Dialog, DialogContent, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import Markdown from "react-markdown";
import { ClusterUpdate } from "../../../api/openapi/models/ClusterUpdate.ts";
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

  // editing
  const [isEditing, setIsEditing] = useState(false);
  const { control, handleSubmit, reset } = useForm<ClusterUpdate>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (cluster) {
      reset({
        name: cluster.name,
        description: cluster.description,
      });
    }
  }, [cluster, reset]);

  const updateCluster = PerspectivesHooks.useUpdateClusterDetails();

  const handleSave: SubmitHandler<ClusterUpdate> = (data) => {
    if (!cluster) return;
    updateCluster.mutate(
      {
        clusterId: cluster.id,
        requestBody: {
          name: data.name,
          description: data.description,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (cluster) {
      reset({
        name: cluster.name,
        description: cluster.description,
      });
    }
  };

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
                {isEditing ? (
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        variant="standard"
                        fullWidth
                        placeholder="Cluster Name"
                        InputProps={{ sx: { fontSize: "2.125rem", fontWeight: 400, color: "primary.dark" } }}
                      />
                    )}
                  />
                ) : (
                  <Typography variant="h4" component="h1" color="primary.dark">
                    {cluster.name}
                  </Typography>
                )}
                <Stack direction="row" spacing={1}>
                  {isEditing ? (
                    <>
                      <Tooltip title="Save">
                        <IconButton
                          onClick={handleSubmit(handleSave)}
                          color="primary"
                          disabled={updateCluster.isPending}
                        >
                          <Save />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton onClick={handleCancel} color="error" disabled={updateCluster.isPending}>
                          <Close />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Edit Details">
                        <IconButton onClick={() => setIsEditing(true)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <RecomputeClusterDescriptionButton aspectId={aspectId} clusterId={cluster.id} />
                    </>
                  )}
                </Stack>
              </Stack>
              {isEditing ? (
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      multiline
                      minRows={2}
                      fullWidth
                      placeholder="Only simple Markdown supported."
                      sx={{ mt: 1 }}
                    />
                  )}
                />
              ) : (
                <Typography pt={1} color="textSecondary">
                  <Markdown>{cluster.description}</Markdown>
                </Typography>
              )}
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
