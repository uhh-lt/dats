import { Box, Card, CircularProgress, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { PerspectivesHooks } from "../../../api/PerspectivesHooks.ts";
import { CardContainer } from "../../../components/MUI/CardContainer.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { PerspectivesActions } from "../perspectivesSlice.ts";

interface ClusterListProps {
  aspectId: number;
  height: number;
}

export function ClusterList({ aspectId, height }: ClusterListProps) {
  // global server state
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);

  // open cluster dialog
  const dispatch = useAppDispatch();
  const handleClick = (clusterId: number) => () => {
    dispatch(PerspectivesActions.onOpenClusterDialog(clusterId));
  };

  return (
    <Card variant="outlined" sx={{ height, borderColor: "grey.500" }}>
      {vis.isSuccess && vis.data.clusters.length > 0 ? (
        <List sx={{ width: "100%", height, overflowY: "auto" }} disablePadding>
          {vis.data.clusters.map((cluster, index) => {
            if (cluster.is_outlier) return null;
            return (
              <ListItem key={cluster.id} disablePadding>
                <ListItemButton role={undefined} dense onClick={handleClick(cluster.id)}>
                  <ListItemIcon>
                    <Box width={42} height={42} display="flex" alignItems="center" justifyContent="flex-start">
                      {getIconComponent(Icon.CLUSTER, { style: { color: colorScheme[index % colorScheme.length] } })}
                    </Box>
                  </ListItemIcon>
                  <ListItemText primary={cluster.name} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      ) : (
        <CardContainer sx={{ height, display: "flex", justifyContent: "center", alignItems: "center" }}>
          {vis.isSuccess ? (
            <>No clusters available!</>
          ) : vis.isLoading || vis.isFetching ? (
            <CircularProgress />
          ) : vis.isError ? (
            <>An Error occurred: {vis.error.message}</>
          ) : null}
        </CardContainer>
      )}
    </Card>
  );
}
