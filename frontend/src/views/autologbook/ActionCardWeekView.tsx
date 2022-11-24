import React from "react";
import ActionCard from "./ActionCard";
import { ActionRead } from "../../api/openapi";
import { List, ListItem, Paper } from "@mui/material";
import { blue } from '@mui/material/colors';


interface ActionCardDayViewProps {
  actions: ActionRead[],
  day: Date;
}

function ActionCardWeekView({ actions, day }: ActionCardDayViewProps) {

  const locale = "en-GB"
  const dateHeader: string = day.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' });

  // reformat datetime to better readable format
  const reformatTimestamp = (ts: string) => {
    // TODO: only necessary to show the time, because we have a calendar view
    let date = new Date(ts)
    let options: Intl.DateTimeFormatOptions = { day: 'numeric', year: 'numeric', month: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit' }
    return date.toLocaleDateString(locale, options)
  }

  return (
    <>
      <Paper variant="outlined" elevation={3} style={{ width: '100%', height: '100%', backgroundColor: 'whitesmoke' }}>
        <Paper style={{ backgroundColor: '#1976d2' }}>
          <div style={{ height: '3em', width: '100%' , display: 'flex',
            justifyContent: 'center', alignItems: 'center', color: 'white' }}>
            {dateHeader}
          </div>
        </Paper>
        <List style={{height: 200, minHeight: '94%', maxHeight: '100%', width: '100%', overflowY: 'scroll'}}>
          {actions.map((action) =>
            <ListItem style={{padding: 5}}>
              <ActionCard actionTypeValue={action.action_type}
                          userId={action.user_id}
                          targetObjectType={action.target_object_type}
                          targetId={action.target_id}
                          executedAt={reformatTimestamp(action.executed)}/>
            </ListItem>)}
        </List>
      </Paper>
    </>
  )
}


export default ActionCardWeekView;
