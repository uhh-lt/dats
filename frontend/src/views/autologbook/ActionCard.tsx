import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { IconButton } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { capitalize } from "lodash";
import { useMemo, useState } from "react";
import {
  ActionTargetObjectType,
  ActionType,
  BBoxAnnotationReadResolvedCode,
  CodeRead,
  DocumentTagRead,
  MemoRead,
  ProjectRead,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../api/openapi";
import UserHooks from "../../api/UserHooks";

interface ActionCardProps {
  actionType: ActionType;
  userId: number;
  targetObjectType: ActionTargetObjectType;
  beforeState: string | undefined;
  afterState: string | undefined;
  executedAt: string;
}

export const readableObjectType = (type: ActionTargetObjectType) => {
  return type.valueOf().split("_").map(capitalize).join(" ");
};

const stateStringToObject = (state: string | undefined, targetObjectType: ActionTargetObjectType) => {
  if (!state) return;

  const parsedState: any = JSON.parse(state);
  switch (targetObjectType) {
    case ActionTargetObjectType.MEMO:
      return parsedState as MemoRead;
    case ActionTargetObjectType.PROJECT:
      return parsedState as ProjectRead;
    case ActionTargetObjectType.DOCUMENT_TAG:
      return parsedState as DocumentTagRead;
    case ActionTargetObjectType.SOURCE_DOCUMENT:
      return parsedState as SourceDocumentRead;
    case ActionTargetObjectType.SPAN_ANNOTATION:
      return parsedState as SpanAnnotationReadResolved;
    case ActionTargetObjectType.BBOX_ANNOTATION:
      return parsedState as BBoxAnnotationReadResolvedCode;
    case ActionTargetObjectType.CODE:
    default:
      return parsedState as CodeRead;
  }
};

function ActionCard({ actionType, userId, targetObjectType, beforeState, afterState, executedAt }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    setExpanded((oldExpanded) => !oldExpanded);
  };

  console.log(targetObjectType);
  console.log(actionType);
  console.log(beforeState);
  console.log(afterState);

  const { beforeStateObj, afterStateObj } = useMemo(() => {
    const beforeStateObj: any = stateStringToObject(beforeState, targetObjectType);
    const afterStateObj: any = stateStringToObject(afterState, targetObjectType);
    return { beforeStateObj, afterStateObj };
  }, [afterState, beforeState, targetObjectType]);

  let backgroundColor;
  switch (actionType) {
    case ActionType.CREATE:
      backgroundColor = "rgba(0, 255, 0, 0.2)";
      break;
    case ActionType.UPDATE:
      backgroundColor = "rgba(255, 180, 30, 0.2)";
      break;
    case ActionType.DELETE:
      backgroundColor = "rgba(255, 87, 51, 0.2)";
      break;
    default:
      backgroundColor = null;
  }

  const targetName = useMemo(() => {
    switch (targetObjectType) {
      case ActionTargetObjectType.MEMO:
      case ActionTargetObjectType.PROJECT:
      case ActionTargetObjectType.DOCUMENT_TAG:
        return afterStateObj ? afterStateObj.title : beforeStateObj.title;
      case ActionTargetObjectType.SOURCE_DOCUMENT:
        return afterStateObj ? afterStateObj.filename : beforeStateObj.filename;
      case ActionTargetObjectType.SPAN_ANNOTATION:
      case ActionTargetObjectType.BBOX_ANNOTATION:
        return afterStateObj ? afterStateObj.code.name : beforeStateObj.code.name;
      case ActionTargetObjectType.CODE:
      default:
        return afterStateObj ? afterStateObj.name : beforeStateObj.name;
    }
  }, [afterStateObj, beforeStateObj, targetObjectType]);

  const user = UserHooks.useGetUser(userId)?.data;
  let userName: string;
  if (!user) {
    userName = userId.toString();
  } else {
    userName = user.first_name + " " + user.last_name;
  }

  // TODO: ausklappbare Beschreibung der Veränderungen bei einem Update

  return (
    <Card variant="outlined" sx={{ width: "100%", backgroundColor: backgroundColor }}>
      <CardContent sx={{ position: "relative" }}>
        <Typography sx={{ fontSize: 12 }} color="text.secondary" gutterBottom>
          User: {userName}
          <span style={{ float: "right" }}>{actionType.valueOf()}</span>
        </Typography>
        <Tooltip title={targetName}>
          <Typography sx={{ mb: 1.0, mt: 1.5 }} variant="h6" component="div">
            {readableObjectType(targetObjectType)}: {targetName}
          </Typography>
        </Tooltip>
        {expanded && <Typography sx={{ mb: 1.0 }}>Demo Text</Typography>}
        <Typography variant="body2">
          {executedAt}
          {actionType === ActionType.UPDATE && (
            <IconButton
              children={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={toggleExpanded}
              style={{ position: "absolute", bottom: 16, right: 10 }}
            />
          )}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default ActionCard;
