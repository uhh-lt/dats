import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormText, FormTextMultiline } from "@components/form-inputs";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ClusterUpdate } from "@models/ClusterUpdate";
import { Close, Edit, Save } from "@mui/icons-material";
import { Box, Dialog, DialogContent, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { useEffect, useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Markdown from "react-markdown";
import { PerspectivesHooks } from "../../api/perspectivesHooks";
import { DocAspectTable } from "../DocAspectTable";
import { ClusterWordCloud } from "./ClusterWordCloud";
import { RecomputeClusterDescriptionButton } from "./RecomputeClusterDescriptionButton";

interface ClusterDetailDialogProps {
  aspectId: number;
}

export function ClusterDetailDialog({ aspectId }: ClusterDetailDialogProps) {
  const { isOpen, data: dialogData, close: handleClose } = useDialogBus("clusterDetail");

  // get cluster information
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);
  const cluster = useMemo(() => {
    if (!vis.data) return null;
    return vis.data.clusters.find((t) => t.id === dialogData?.clusterId);
  }, [vis.data, dialogData]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // editing
  const [isEditing, setIsEditing] = useState(false);
  const { control, handleSubmit, reset } = useForm<ClusterUpdate>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen && cluster) {
      reset({
        name: cluster.name,
        description: cluster.description,
      });
    }
  }, [isOpen, cluster, reset]);

  const { mutate: updateClusterMutation, isPending } = PerspectivesHooks.useUpdateClusterDetails();

  const handleClusterUpdate: SubmitHandler<ClusterUpdate> = (data) => {
    if (!cluster) return;
    updateClusterMutation(
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
    <Dialog open={isOpen && !!cluster} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
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
                  <FormText
                    name="name"
                    control={control}
                    textFieldProps={{
                      variant: "standard",
                      fullWidth: true,
                      placeholder: "Cluster Name",
                      slotProps: { input: { sx: { fontSize: "2.125rem", fontWeight: 400, color: "primary.dark" } } },
                    }}
                  />
                ) : (
                  <Typography variant="h4" component="h1" color="primary.dark">
                    {cluster.name}
                  </Typography>
                )}
                <Stack direction="row" spacing={1}>
                  {isEditing && (
                    <Tooltip key="save" title="Save">
                      <IconButton onClick={handleSubmit(handleClusterUpdate)} color="primary" disabled={isPending}>
                        <Save />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isEditing && (
                    <Tooltip key="cancel" title="Cancel">
                      <IconButton onClick={handleCancel} color="error" disabled={isPending}>
                        <Close />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!isEditing && (
                    <Tooltip key="edit" title="Edit title and description">
                      <IconButton onClick={() => setIsEditing(true)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!isEditing && (
                    <RecomputeClusterDescriptionButton key="recompute" aspectId={aspectId} clusterId={cluster.id} />
                  )}
                </Stack>
              </Stack>
              {isEditing ? (
                <FormTextMultiline
                  name="description"
                  control={control}
                  textFieldProps={{
                    minRows: 2,
                    fullWidth: true,
                    placeholder: "Only simple Markdown supported.",
                    sx: { mt: 1 },
                  }}
                />
              ) : (
                <Typography component="div" pt={1} color="textSecondary">
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
