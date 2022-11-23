import React from "react";
import ActionCard from "./ActionCard";
import { ActionRead } from "../../api/openapi";

interface ActionCardDayViewProps {
  actions: ActionRead[],
  day: Date;
}

function ActionCardDayView({ actions, day }: ActionCardDayViewProps) {

  const dateHeader: () => string = () => {
    return "date";
  }

  // reformat datetime to better readable format
  const reformatTimestamp = (ts: string) => {
    let date = new Date(ts)
    let options: Intl.DateTimeFormatOptions = { day: 'numeric', year: 'numeric', month: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit' }
    return date.toLocaleDateString("en-GB", options)
  }

  return (
    <>
      <div>
        <p>Hello</p>
        {actions.map((action) =>
          <ActionCard actionTypeValue={action.action_type}
                      userId={action.user_id}
                      targetObjectType={action.target_object_type}
                      targetId={action.target_id}
                      executedAt={reformatTimestamp(action.executed)}/>)}
      </div>
    </>
  )
}


export default ActionCardDayView;
