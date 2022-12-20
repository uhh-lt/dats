import React, { useRef } from "react";
import ActionCard from "./ActionCard";
import { ActionRead } from "../../api/openapi";
import { Box, Card, CardContent, CardHeader, List, ListItem, Paper } from "@mui/material";
import Typography from "@mui/material/Typography";
import { useVirtualizer } from "@tanstack/react-virtual";


interface ActionCardWeekViewProps {
  actions: ActionRead[],
  day: Date;
}

function ActionCardWeekView({ actions, day }: ActionCardWeekViewProps) {

  const dateHeader: string = day.toLocaleDateString("en-GB", { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <>
      <Card variant="outlined" elevation={3} style={{ width: '100%', height: '100%', backgroundColor: 'whitesmoke' }}>
        <CardHeader
          style={{ backgroundColor: '#1976d2', color: 'white', padding: "8px"}}
          title={dateHeader}
          titleTypographyProps={{
          variant: "h6",
            style: {
            textAlign: "center"
            }
          }}
        />
        <ActionCardWeekViewContent actions={actions} />
      </Card>
    </>
  )
}


export default ActionCardWeekView;


interface ActionCardWeekViewContentProps {
  actions: ActionRead[];
}

// reformat datetime to better readable format
const reformatTimestamp = (ts: string) => {
  // TODO: only necessary to show the time, because we have a calendar view
  let date = new Date(ts)
  let options: Intl.DateTimeFormatOptions = { day: 'numeric', year: 'numeric', month: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit' }
  return date.toLocaleDateString("en-GB", options)
}

function ActionCardWeekViewContent({ actions }: ActionCardWeekViewContentProps) {
  const listRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: actions.length || 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => 155,
  });

  return (
    <CardContent ref={listRef} style={{ height: '94%', overflowY: 'auto', padding: 0}}>
      <List style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}>
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            let action = actions[virtualItem.index]
            return <ListItem key={virtualItem.key}
                             ref={rowVirtualizer.measureElement}
                             data-index={virtualItem.index}
                             style={{padding: 5, position: "absolute", top: 0, left: 0,
                               transform: `translateY(${virtualItem.start}px)`}}>
              <ActionCard actionTypeValue={action.action_type}
                          userId={action.user_id}
                          targetObjectType={action.target_object_type}
                          targetId={action.target_id}
                          executedAt={reformatTimestamp(action.executed)}/>
            </ListItem>})}
        </List>
    </CardContent>
  )
}
