import {
  Box,
  Checkbox,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  PopoverOrigin,
  TextField,
  Typography,
} from "@mui/material";
import { isEqual } from "lodash";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { ClusterRead } from "../../../../api/openapi/models/ClusterRead.ts";
import { PerspectivesDoc } from "../../../../api/openapi/models/PerspectivesDoc.ts";
import { PerspectivesJobType } from "../../../../api/openapi/models/PerspectivesJobType.ts";
import { PerspectivesHooks } from "../../../../api/PerspectivesHooks.ts";
import { CheckboxState } from "../../../../utils/CheckboxState.ts";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils.tsx";

interface ClusterMenuProps {
  aspectId: number;
  popoverOrigin: PopoverOrigin | undefined;
  anchorEl: HTMLElement | null;
  setAnchorEl: Dispatch<SetStateAction<HTMLElement | null>>;
  sdocIds: number[];
  colorScheme: string[];
}

export function ClusterMenu(props: ClusterMenuProps) {
  // global server state (react-query)
  const vis = PerspectivesHooks.useGetDocVisualization(props.aspectId);

  const initialChecked: Map<number, CheckboxState> | undefined = useMemo(() => {
    if (!vis.data) return undefined;

    const sdocId2doc = vis.data.docs.reduce(
      (acc, doc) => {
        acc[doc.sdoc_id] = doc;
        return acc;
      },
      {} as Record<number, PerspectivesDoc>,
    );

    // init cluster counts
    const clusterCounts: Record<number, number> = vis.data.clusters.reduce(
      (acc, cluster) => {
        acc[cluster.id] = 0;
        return acc;
      },
      {} as Record<number, number>,
    );

    // fill cluster counts
    props.sdocIds.forEach((sdocId) => {
      const doc = sdocId2doc[sdocId];
      clusterCounts[doc.cluster_id] = (clusterCounts[doc.cluster_id] || 0) + 1;
    });

    // Depending on the count, set the CheckboxState
    const maxTags = props.sdocIds.length;
    return new Map(
      Object.entries(clusterCounts).map(([clusterId, clusterCount]) => [
        parseInt(clusterId),
        clusterCount === 0
          ? CheckboxState.NOT_CHECKED
          : clusterCount < maxTags
            ? CheckboxState.INDETERMINATE
            : CheckboxState.CHECKED,
      ]),
    );
  }, [vis.data, props.sdocIds]);

  if (!vis.data || !initialChecked || vis.data.clusters.length === 0) {
    return null;
  }
  return <ClusterMenuContent clusters={vis.data.clusters} initialChecked={initialChecked} {...props} />;
}

function ClusterMenuContent({
  aspectId,
  sdocIds,
  anchorEl,
  setAnchorEl,
  popoverOrigin,
  clusters,
  initialChecked,
  colorScheme,
}: { clusters: ClusterRead[]; initialChecked: Map<number, CheckboxState> } & ClusterMenuProps) {
  // menu state
  const open = Boolean(anchorEl);
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, [setAnchorEl]);

  // checkbox state
  const [checked, setChecked] = useState<Map<number, CheckboxState>>(new Map());
  useEffect(() => {
    setChecked(new Map(initialChecked));
  }, [initialChecked]);
  const hasChanged = useMemo(() => !isEqual(initialChecked, checked), [initialChecked, checked]);
  const hasNoChecked = useMemo(
    () => Array.from(checked.values()).every((state) => state === CheckboxState.NOT_CHECKED),
    [checked],
  );
  const handleCheck = (clusterId: number) => () => {
    setChecked((checked) => {
      const newCheckStatus =
        checked.get(clusterId) === CheckboxState.CHECKED ? CheckboxState.NOT_CHECKED : CheckboxState.CHECKED;
      return new Map(
        clusters.map((cluster) => {
          if (cluster.id !== clusterId) {
            return [cluster.id, CheckboxState.NOT_CHECKED];
          } else {
            return [cluster.id, newCheckStatus];
          }
        }),
      );
    });
  };

  // filter feature
  const [search, setSearch] = useState<string>("");
  const filteredClusterIndexes: number[] = useMemo(() => {
    return clusters
      .map((cluster, index) => (cluster.name.toLowerCase().startsWith(search.toLowerCase()) ? index : -1))
      .filter((index) => index !== -1);
  }, [clusters, search]);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  // actions
  const { mutate: startPerspectivesJobMutation, isPending } = PerspectivesHooks.useStartPerspectivesJob();
  const handleSetCluster = useCallback(() => {
    // find entry where CheckboxState is Checked
    const checkedClusters = Array.from(checked).filter(([, state]) => state === CheckboxState.CHECKED);
    if (checkedClusters.length > 1) {
      console.error("Expected at most one cluster to be checked, but found:", checkedClusters.length);
      return;
    }
    startPerspectivesJobMutation(
      {
        aspectId: aspectId,
        requestBody: {
          perspectives_job_type: PerspectivesJobType.CHANGE_CLUSTER,
          cluster_id: checkedClusters.length === 1 ? checkedClusters[0][0] : -1, // -1 means "no cluster / outlier",
          sdoc_ids: sdocIds,
        },
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }, [aspectId, checked, handleClose, sdocIds, startPerspectivesJobMutation]);
  const handleCreateCluster = useCallback(() => {
    startPerspectivesJobMutation(
      {
        aspectId: aspectId,
        requestBody: {
          perspectives_job_type: PerspectivesJobType.CREATE_CLUSTER_WITH_SDOCS,
          sdoc_ids: sdocIds,
        },
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }, [aspectId, startPerspectivesJobMutation, handleClose, sdocIds]);

  // Display buttons depending on state
  const actionMenu: React.ReactNode = useMemo(() => {
    if (hasChanged) {
      return (
        <ListItem disablePadding dense key={"apply"}>
          <ListItemButton onClick={handleSetCluster} dense disabled={isPending}>
            <Typography align={"center"} sx={{ width: "100%" }}>
              {hasNoChecked ? "Mark as outlier (removing docs)" : "Set to new cluster"}
            </Typography>
          </ListItemButton>
        </ListItem>
      );
    } else if (
      search.trim().length === 0 ||
      (search.trim().length > 0 &&
        filteredClusterIndexes.map((index) => clusters[index].name).indexOf(search.trim()) === -1)
    ) {
      return (
        <ListItemButton onClick={handleCreateCluster}>
          <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
          <ListItemText primary={search.length > 0 ? `"${search}" (Create new)` : "Create new cluster"} />
        </ListItemButton>
      );
    }
    return null;
  }, [
    filteredClusterIndexes,
    handleSetCluster,
    handleCreateCluster,
    hasChanged,
    hasNoChecked,
    isPending,
    search,
    clusters,
  ]);

  return (
    <Popover
      id="cluster-menu"
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={popoverOrigin}
      slotProps={{
        paper: {
          elevation: 1,
        },
      }}
    >
      <List>
        <ListItem>
          <TextField
            value={search}
            autoFocus
            onChange={handleSearchChange}
            variant="standard"
            fullWidth
            placeholder="Search cluster..."
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">{getIconComponent(Icon.SEARCH)}</InputAdornment>,
              },
            }}
          />
        </ListItem>

        <Divider />

        <Box sx={{ maxHeight: "240px", overflowY: "auto" }}>
          {filteredClusterIndexes.map((index) => {
            const cluster = clusters[index];
            if (cluster.is_outlier) return null; // skip outlier clusters
            const labelId = `tag-menu-list-label-${cluster.name}`;

            return (
              <ListItem
                key={cluster.id}
                disablePadding
                dense
                secondaryAction={
                  <Checkbox
                    edge="end"
                    onChange={handleCheck(cluster.id)}
                    checked={checked.get(cluster.id) === CheckboxState.CHECKED}
                    indeterminate={checked.get(cluster.id) === CheckboxState.INDETERMINATE}
                    tabIndex={-1}
                    disableRipple
                    slotProps={{
                      input: {
                        "aria-labelledby": labelId,
                      },
                    }}
                    style={{ padding: "0 8px 0 0" }}
                  />
                }
              >
                <ListItemButton onClick={handleCheck(cluster.id)} dense>
                  <ListItemIcon sx={{ minWidth: "32px" }}>
                    {getIconComponent(Icon.CLUSTER, { style: { color: colorScheme[index % colorScheme.length] } })}
                  </ListItemIcon>
                  <ListItemText id={labelId} primary={cluster.name} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </Box>

        {actionMenu && <Divider />}
        {actionMenu}
      </List>
    </Popover>
  );
}
