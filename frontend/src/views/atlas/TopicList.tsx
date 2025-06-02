import { Box, Card, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";

interface TopicListProps {
  aspectId: number;
  height: number;
}

function TopicList({ aspectId, height }: TopicListProps) {
  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);

  return (
    <Card variant="outlined" sx={{ height, overflowY: "auto" }}>
      <List sx={{ width: "100%" }} disablePadding>
        {vis.data?.topics.map((topic, index) => {
          if (topic.is_outlier) return null;
          return (
            <ListItem key={topic.id} disablePadding>
              <ListItemButton role={undefined} dense>
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
    </Card>
  );
}

export default TopicList;
