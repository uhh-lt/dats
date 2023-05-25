import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CardActions, Collapse, IconButton } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { ActionRead } from "../../api/openapi";
import UserName from "../../components/UserName";
import {
  action2TargetTitle,
  actionTarget2Title,
  actionType2Color,
  formatTimestampAsTime,
  generateActionStrings,
} from "./utils";
import _ from "lodash";

interface ActionCardProps {
  action: ActionRead;
}

function ActionCard({ action }: ActionCardProps) {
  // local state
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    setExpanded((oldExpanded) => !oldExpanded);
  };

  const targetObjectTitle = useMemo(() => action2TargetTitle(action), [action]);

  const actionStrings = generateActionStrings(action.before_state, action.after_state);

  return (
    <Card variant="outlined" sx={{ width: "100%", backgroundColor: actionType2Color[action.action_type] }}>
      <CardContent sx={{ pb: 0 }}>
        <Typography sx={{ fontSize: 12 }} color="text.secondary" gutterBottom>
          User: <UserName userId={action.user_id} />
          <span style={{ float: "right" }}>{action.action_type.valueOf()}</span>
        </Typography>
        <Tooltip title={`Tooltip`}>
          <Typography sx={{ mb: 1.0, mt: 1.5 }} variant="h6" component="div">
            {actionTarget2Title[action.target_type]}
            {": "}
            {targetObjectTitle ? `${targetObjectTitle}` : `Could not parse action ${action.id}!`}
          </Typography>
        </Tooltip>
      </CardContent>
      <CardActions disableSpacing>
        <Typography variant="body2" sx={{ ml: 1 }}>
          {formatTimestampAsTime(action.executed)}
        </Typography>
        <IconButton
          children={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={toggleExpanded}
          sx={{ ml: "auto" }}
        />
      </CardActions>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 0 }}>
          <Typography>Before:</Typography>
          <pre
            style={{
              marginTop: 0,
              backgroundColor: "white",
              overflowX: "auto",
            }}
          >
            {actionStrings.before}
          </pre>
          <Typography>After:</Typography>
          <pre
            style={{
              marginTop: 0,
              backgroundColor: "white",
              overflowX: "auto",
            }}
          >
            {actionStrings.after}
          </pre>
        </CardContent>
      </Collapse>
    </Card>
  );
}

export default ActionCard;
