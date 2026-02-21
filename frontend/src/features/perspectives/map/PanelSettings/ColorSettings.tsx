import InfoIcon from "@mui/icons-material/Info";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Radio,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import * as d3 from "d3";
import { useState } from "react";
import { PerspectivesJobType } from "../../../../api/openapi/models/PerspectivesJobType.ts";
import { PerspectivesVisualization } from "../../../../api/openapi/models/PerspectivesVisualization.ts";
import { PerspectivesHooks } from "../../../../api/PerspectivesHooks.ts";
import { ConfirmationAPI } from "../../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils.tsx";
import { PerspectivesActions } from "../../perspectivesSlice.ts";
import { ClusterCreationDialog } from "./ClusterCreationDialog.tsx";

const colorSchemes: Record<string, string[]> = {
  category: d3.schemeCategory10 as string[],
  accent: d3.schemeAccent as string[],
  dark: d3.schemeDark2 as string[],
  observable: d3.schemeObservable10 as string[],
  paired: d3.schemePaired as string[],
  pastel1: d3.schemePastel1 as string[],
  pastel2: d3.schemePastel2 as string[],
  set1: d3.schemeSet1 as string[],
  set2: d3.schemeSet2 as string[],
  set3: d3.schemeSet3 as string[],
  tableau: d3.schemeTableau10 as string[],
};

const getAcceptedAssignmentsOfCluster = (clusterId: number, vis: PerspectivesVisualization) => {
  return vis.docs.filter((doc) => doc.cluster_id === clusterId).filter((doc) => doc.is_accepted).length;
};

interface ColorSettingsProps {
  aspectId: number;
}

export function ColorSettings({ aspectId }: ColorSettingsProps) {
  // view settings
  const colorBy = useAppSelector((state) => state.perspectives.colorBy);
  const colorSchemeName = useAppSelector((state) => state.perspectives.colorSchemeName);
  const pointSize = useAppSelector((state) => state.perspectives.pointSize);
  const showLabels = useAppSelector((state) => state.perspectives.showLabels);

  // event handlers
  const dispatch = useAppDispatch();
  const handleColorByChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(PerspectivesActions.onChangeColorBy(event.target.value));
  };
  const handleColorSchemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      PerspectivesActions.onChangeColorScheme({
        colorSchemeName: event.target.value,
        colorScheme: colorSchemes[event.target.value],
      }),
    );
  };
  const handlePointSizeChange = (_event: React.SyntheticEvent | Event, value: number | number[]) => {
    dispatch(PerspectivesActions.onChangePointSize(value as number));
  };
  const handleShowLabelsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(PerspectivesActions.onChangeShowLabels(event.target.checked));
  };

  // legend
  const { mutate: startPerspectivesJob, isPending } = PerspectivesHooks.useStartPerspectivesJob();

  // global server state
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);

  // cluster click
  const handleClusterClick = (clusterId: number) => () => {
    if (mergeMode) {
      handleToggleCluster(clusterId);
    } else if (deleteMode || splitMode) {
      handleSingleSelect(clusterId);
    } else {
      handleSelectCluster(clusterId);
    }
  };

  // cluster selection
  const highlightedClusterId = useAppSelector((state) => state.perspectives.highlightedClusterId);
  const handleSelectCluster = (clusterId: number) => {
    dispatch(PerspectivesActions.onSelectCluster(clusterId));
  };

  // merging
  const [mergeMode, setMergeMode] = useState(false);
  const handleToggleMergeMode = () => {
    setMergeMode((prev) => !prev);
    setChecked([]);
  };
  const handleConfirmMerge = () => {
    if (checked.length !== 2) return;
    startPerspectivesJob(
      {
        aspectId,
        requestBody: {
          perspectives_job_type: PerspectivesJobType.MERGE_CLUSTERS,
          cluster_to_keep: checked[0],
          cluster_to_merge: checked[1],
        },
      },
      {
        onSuccess: () => {
          setMergeMode(false);
          setChecked([]);
        },
      },
    );
  };

  // deletion
  const [deleteMode, setDeleteMode] = useState(false);
  const handleToggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
    setChoosen(undefined);
  };
  const handleConfirmDeletion = () => {
    if (choosen === undefined) return;
    const startJob = () => {
      startPerspectivesJob(
        {
          aspectId,
          requestBody: {
            perspectives_job_type: PerspectivesJobType.REMOVE_CLUSTER,
            cluster_id: choosen,
          },
        },
        {
          onSuccess: () => {
            setDeleteMode(false);
            setChoosen(undefined);
          },
        },
      );
    };
    const numAccepted = getAcceptedAssignmentsOfCluster(choosen, vis.data!);
    if (numAccepted === 0) {
      startJob();
    } else {
      ConfirmationAPI.openConfirmationDialog({
        text: `Are you sure you want to delete cluster ${choosen}? This will also reset your ${numAccepted} reviewed document&harr;cluster assignments.`,
        onAccept: () => {
          startJob();
        },
      });
    }
  };

  // splitting
  const [splitMode, setSplitMode] = useState(false);
  const handleToggleSplitMode = () => {
    setSplitMode((prev) => !prev);
    setChoosen(undefined);
  };
  const handleConfirmSplit = () => {
    if (choosen === undefined) return;
    const startJob = () => {
      startPerspectivesJob(
        {
          aspectId,
          requestBody: {
            perspectives_job_type: PerspectivesJobType.SPLIT_CLUSTER,
            cluster_id: choosen,
            split_into: null, // null means automatic splitting
          },
        },
        {
          onSuccess: () => {
            setSplitMode(false);
            setChoosen(undefined);
          },
        },
      );
    };
    const numAccepted = getAcceptedAssignmentsOfCluster(choosen, vis.data!);
    if (numAccepted === 0) {
      startJob();
    } else {
      ConfirmationAPI.openConfirmationDialog({
        text: `Are you sure you want to split cluster ${choosen}? This will also reset your ${numAccepted} reviewed document&harr;cluster assignments.`,
        onAccept: () => {
          startJob();
        },
      });
    }
  };

  // multi select with checkboxes
  const [checked, setChecked] = useState<number[]>([]);
  const handleToggleCluster = (clusterId: number) => {
    const currentIndex = checked.indexOf(clusterId);
    const newChecked = [...checked];
    if (currentIndex === -1) {
      newChecked.push(clusterId);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  // single select
  const [choosen, setChoosen] = useState<number | undefined>(undefined);
  const handleSingleSelect = (clusterId: number) => {
    if (choosen === clusterId) {
      setChoosen(undefined);
    } else {
      setChoosen(clusterId);
    }
  };

  const selectType = mergeMode ? "multi" : deleteMode || splitMode ? "single" : "none";

  // info click
  const handleInfoClick = (clusterId: number) => () => {
    dispatch(PerspectivesActions.onOpenClusterDialog(clusterId));
  };

  return (
    <Box>
      <Stack spacing={3} p={2}>
        <TextField
          select
          label="Color by"
          value={colorBy}
          onChange={handleColorByChange}
          size="small"
          variant="outlined"
          disabled
        >
          <MenuItem value="cluster-broad">Clusters: Broad</MenuItem>
          <MenuItem value="cluster-medium">Clusters: Medium</MenuItem>
          <MenuItem value="cluster-fine">Clusters: Fine</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Color Scheme"
          value={colorSchemeName}
          onChange={handleColorSchemeChange}
          size="small"
          variant="outlined"
          slotProps={{
            select: {
              MenuProps: {
                PaperProps: {
                  style: {
                    maxHeight: 300, // Adjust dropdown max height if needed
                  },
                },
              },
              renderValue: () => {
                const colors = colorSchemes[colorSchemeName];
                return (
                  <Stack direction={"row"} spacing={1} alignItems="center">
                    <Typography width="90px" flexShrink={0}>
                      {colorSchemeName}
                    </Typography>
                    <Stack direction={"row"} spacing={0.5} width="100%">
                      {colors.map((color, index) => (
                        <Box
                          key={`${colorSchemeName}-selected-${color}-${index}`}
                          sx={{
                            height: "12px",
                            width: "12px",
                            backgroundColor: color,
                          }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                );
              },
            },
          }}
        >
          {Object.entries(colorSchemes).map(([schemeName, colors]) => (
            <MenuItem key={schemeName} value={schemeName}>
              <Stack direction={"row"} spacing={1} alignItems="center">
                <Typography width="90px" flexShrink={0}>
                  {schemeName}
                </Typography>
                <Stack direction={"row"} spacing={0.5} width="100%">
                  {colors.map((color, index) => (
                    <Box
                      key={`${schemeName}-selected-${color}-${index}`}
                      sx={{
                        height: "12px",
                        width: "12px",
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </MenuItem>
          ))}
        </TextField>
        <Box>
          <Typography color="textSecondary">Point Size</Typography>
          <Slider
            size="small"
            defaultValue={pointSize}
            step={1}
            min={5}
            max={100}
            onChangeCommitted={handlePointSizeChange}
          />
        </Box>
        <Box style={{ marginTop: "12px" }}>
          <FormControlLabel
            control={<Switch checked={showLabels} onChange={handleShowLabelsChange} />}
            label={<Typography color="textSecondary">Show Cluster Labels</Typography>}
          />
        </Box>
      </Stack>
      <Divider />
      <Stack spacing={1} mt={2}>
        <Typography px={1.5} variant="h6" alignItems="center" display="flex" gap={1} color="textSecondary">
          {getIconComponent(Icon.CLUSTERS, { style: {} })}
          Clusters
        </Typography>
        <Stack direction="row" px={1} spacing={1} alignItems="center">
          {!mergeMode && !deleteMode && !splitMode && (
            <>
              <ClusterCreationDialog aspectId={aspectId} />
              <Tooltip
                enterDelay={500}
                placement="bottom-start"
                title={
                  <>
                    <Typography color="inherit">Cluster Removal</Typography>
                    This action <em>deletes</em> the cluster. The documents are assigned to the closest cluster. Your
                    document&harr;cluster assignments are reset!
                  </>
                }
              >
                <span>
                  <Button onClick={handleToggleDeleteMode} disabled={isPending}>
                    Remove
                  </Button>
                </span>
              </Tooltip>
              <Tooltip
                enterDelay={500}
                placement="bottom-start"
                title={
                  <>
                    <Typography color="inherit">Cluster Splitting</Typography>
                    This action analyzes and <em>splits documents into new clusters</em>. It <u>deletes</u> the cluster,
                    but creates several new ones. Your document&harr;cluster assignments are reset!
                  </>
                }
              >
                <span>
                  <Button onClick={handleToggleSplitMode} disabled={isPending}>
                    Split
                  </Button>
                </span>
              </Tooltip>
              <Tooltip
                enterDelay={500}
                placement="bottom-start"
                title={
                  <>
                    <Typography color="inherit">Cluster Merging</Typography>
                    This action <em>merges two clusters</em>. One cluster is kept, one is <u>deleted</u>. All documents
                    are assigned to the kept cluster.
                  </>
                }
              >
                <span>
                  <Button onClick={handleToggleMergeMode} disabled={isPending}>
                    Merge
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
          {mergeMode && (
            <>
              <Button onClick={handleConfirmMerge} disabled={checked.length !== 2} loading={isPending}>
                Confirm Merge
              </Button>
              <Button onClick={handleToggleMergeMode} disabled={isPending}>
                Cancel Merge
              </Button>
            </>
          )}
          {deleteMode && (
            <>
              <Button onClick={handleConfirmDeletion} disabled={choosen === undefined} loading={isPending}>
                Confirm Deletion
              </Button>
              <Button onClick={handleToggleDeleteMode} disabled={isPending}>
                Cancel Deletion
              </Button>
            </>
          )}
          {splitMode && (
            <>
              <Button onClick={handleConfirmSplit} disabled={choosen === undefined} loading={isPending}>
                Confirm Split
              </Button>
              <Button onClick={handleToggleSplitMode} disabled={isPending}>
                Cancel Split
              </Button>
            </>
          )}
        </Stack>
        <Typography px={2} variant="caption" color="textSecondary">
          {mergeMode
            ? "Select 2 clusters to merge:"
            : deleteMode
              ? "Select cluster to delete:"
              : splitMode
                ? "Select cluster to split:"
                : "Click cluster to highlight corresponding documents:"}
        </Typography>
        <List sx={{ width: "100%" }} disablePadding>
          {vis.data?.clusters.map((cluster, index) => {
            if (cluster.is_outlier) return null;
            const colors = colorSchemes[colorSchemeName];
            return (
              <ListItem
                key={cluster.id}
                secondaryAction={
                  <IconButton edge="end" onClick={handleInfoClick(cluster.id)}>
                    <InfoIcon />
                  </IconButton>
                }
                disablePadding
              >
                <ListItemButton
                  selected={highlightedClusterId === cluster.id}
                  role={undefined}
                  dense
                  onClick={handleClusterClick(cluster.id)}
                >
                  <ListItemIcon>
                    {selectType == "single" ? (
                      <Radio edge="start" checked={choosen === cluster.id} tabIndex={-1} disableRipple />
                    ) : selectType == "multi" ? (
                      <Checkbox edge="start" checked={checked.includes(cluster.id)} tabIndex={-1} disableRipple />
                    ) : (
                      <Box width={42} height={42} display="flex" alignItems="center" justifyContent="flex-start">
                        {getIconComponent(Icon.CLUSTER, { style: { color: colors[index % colors.length] } })}
                      </Box>
                    )}
                  </ListItemIcon>
                  <ListItemText primary={cluster.name} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Box px={2}>
          <Alert severity="info">
            Tipp: Changing document&harr;cluster assignments updates the affected clusters (name, description, words,
            etc.)!
          </Alert>
        </Box>
      </Stack>
    </Box>
  );
}
