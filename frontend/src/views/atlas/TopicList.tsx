import { Box, Card, CircularProgress, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import CardContainer from "../../components/MUI/CardContainer.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { AtlasActions } from "./atlasSlice.ts";

interface TopicListProps {
  aspectId: number;
  height: number;
}

function TopicList({ aspectId, height }: TopicListProps) {
  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);

  // open topic dialog
  const dispatch = useAppDispatch();
  const handleClick = (topicId: number) => () => {
    dispatch(AtlasActions.onOpenTopicDialog(topicId));
  };

  return (
    <Card variant="outlined" sx={{ height }}>
      {vis.isSuccess && vis.data.topics.length > 0 ? (
        <List sx={{ width: "100%", overflowY: "auto" }} disablePadding>
          {vis.data.topics.map((topic, index) => {
            if (topic.is_outlier) return null;
            return (
              <ListItem key={topic.id} disablePadding>
                <ListItemButton role={undefined} dense onClick={handleClick(topic.id)}>
                  <ListItemIcon>
                    <Box width={42} height={42} display="flex" alignItems="center" justifyContent="flex-start">
                      {getIconComponent(Icon.TOPIC, { style: { color: colorScheme[index % colorScheme.length] } })}
                    </Box>
                  </ListItemIcon>
                  <ListItemText primary={topic.name} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      ) : (
        <CardContainer sx={{ height, display: "flex", justifyContent: "center", alignItems: "center" }}>
          {vis.isSuccess ? (
            <>No topics available!</>
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

export default TopicList;
