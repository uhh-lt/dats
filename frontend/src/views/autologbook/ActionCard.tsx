import * as React from "react";
import { useMemo, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  ActionTargetObjectType,
  ActionType,
  BBoxAnnotationReadResolvedCode,
  CodeRead,
  DocumentTagRead,
  MemoRead,
  ProjectRead,
  SourceDocumentRead,
  SpanAnnotationReadResolved
} from "../../api/openapi";
import UserHooks from "../../api/UserHooks";
import useGetActionCardsActionTarget from "./useGetActionCardsActionTarget";
import Tooltip from "@mui/material/Tooltip";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { IconButton } from "@mui/material";

interface ActionCardProps {
  actionType: ActionType;
  userId: number;
  targetObjectType: ActionTargetObjectType;
  targetId: number;
  executedAt: string;
}

function ActionCard({ actionType, userId, targetObjectType, targetId, executedAt }: ActionCardProps) {

  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    setExpanded((oldExpanded) => !oldExpanded)
  }

  let backgroundColor
  switch (actionType) {
    case ActionType.CREATE:
      backgroundColor = 'rgba(0, 255, 0, 0.2)'
      break;
    case ActionType.UPDATE:
      backgroundColor = 'rgba(255, 180, 30, 0.2)'
      break;
    case ActionType.DELETE:
      backgroundColor = 'rgba(255, 87, 51, 0.2)'
      break;
    default:
      backgroundColor = null
  }

  let readObject;
  const targetObject = useGetActionCardsActionTarget(targetObjectType)(targetId)
  const targetName = useMemo(() => {
    if (!targetObject.data)
      return "Loading"

    switch (targetObjectType) {
      case ActionTargetObjectType.MEMO:
        readObject = targetObject?.data! as MemoRead
        return readObject.title
      case ActionTargetObjectType.PROJECT:
        readObject = targetObject?.data! as ProjectRead
        return readObject.title
      case ActionTargetObjectType.DOCUMENT_TAG:
        readObject = targetObject?.data! as DocumentTagRead
        return readObject.title
      case ActionTargetObjectType.ANNOTATION_DOCUMENT:
        return "Annotation Document"
      case ActionTargetObjectType.SPAN_GROUP:
        return "Span Group does not exist"
      case ActionTargetObjectType.SOURCE_DOCUMENT:
        readObject = targetObject?.data! as SourceDocumentRead
        return readObject.filename
      case ActionTargetObjectType.SPAN_ANNOTATION:
        readObject = targetObject?.data! as SpanAnnotationReadResolved
        return readObject.code.name
      case ActionTargetObjectType.BBOX_ANNOTATION:
        readObject = targetObject?.data! as BBoxAnnotationReadResolvedCode
        return readObject.code.name
      case ActionTargetObjectType.CODE:
      default:
        readObject = targetObject?.data! as CodeRead
        return readObject.name
    }
  }, [targetObject.data])

  const user = UserHooks.useGetUser(userId)?.data;
  let userName: string
  if (!user) {
    userName = userId.toString()
  } else {
    userName = user.first_name + " " + user.last_name;
  }

  return (
    <Card variant="outlined" sx={{ width: '100%', backgroundColor: backgroundColor }}>
      <CardContent sx={{position: "relative"}}>
        <Typography sx={{ fontSize: 12 }} color="text.secondary" gutterBottom>
          User: {userName}<span style={{ float: "right" }}>{actionType.valueOf()}</span>
        </Typography>
        <Tooltip title={targetName}>
          <Typography sx={{ mb: 1.0, mt: 1.5 }} variant="h6" component="div">
            {targetObjectType}: {targetName}
          </Typography>
        </Tooltip>
        {expanded && <Typography sx={{ mb: 1.0 }}>Demo Text</Typography>}
        <Typography variant="body2">
          {executedAt}
          <IconButton children={expanded ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
                      onClick={toggleExpanded} style={{ position: "absolute", bottom: 16, right: 10 }}/>
        </Typography>
      </CardContent>
    </Card>
  );
}

export default ActionCard;
