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
import useGetActionCardsActionTarget from "./useGetActionCardsActionTarget";

interface ActionCardProps {
  actionType: ActionType;
  userId: number;
  targetObjectType: ActionTargetObjectType;
  targetId: number;
  executedAt: string;
}

export const readableObjectType = (type: ActionTargetObjectType) => {
  return type.valueOf().split("_").map(capitalize).join(" ");
};

function ActionCard({ actionType, userId, targetObjectType, targetId, executedAt }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    setExpanded((oldExpanded) => !oldExpanded);
  };

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

  const targetObject = useGetActionCardsActionTarget(targetObjectType)(targetId);
  const targetName = useMemo(() => {
    if (!targetObject.data) return "Loading";

    switch (targetObjectType) {
      case ActionTargetObjectType.MEMO:
        return (targetObject?.data! as MemoRead).title;
      case ActionTargetObjectType.PROJECT:
        return (targetObject?.data! as ProjectRead).title;
      case ActionTargetObjectType.DOCUMENT_TAG:
        return (targetObject?.data! as DocumentTagRead).title;
      case ActionTargetObjectType.SOURCE_DOCUMENT:
        return (targetObject?.data! as SourceDocumentRead).filename;
      case ActionTargetObjectType.SPAN_ANNOTATION:
        return (targetObject?.data! as SpanAnnotationReadResolved).code.name;
      case ActionTargetObjectType.BBOX_ANNOTATION:
        return (targetObject?.data! as BBoxAnnotationReadResolvedCode).code.name;
      case ActionTargetObjectType.CODE:
      default:
        return (targetObject?.data! as CodeRead).name;
    }
  }, [targetObject.data, targetObjectType]);

  const user = UserHooks.useGetUser(userId)?.data;
  let userName: string;
  if (!user) {
    userName = userId.toString();
  } else {
    userName = user.first_name + " " + user.last_name;
  }

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
          <IconButton
            children={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={toggleExpanded}
            style={{ position: "absolute", bottom: 16, right: 10 }}
          />
        </Typography>
      </CardContent>
    </Card>
  );
}

export default ActionCard;
