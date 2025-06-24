import { CardContent, CardHeader, MenuItem, Typography } from "@mui/material";
import { useRef } from "react";
import { NodeProps } from "reactflow";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import GenericPositionMenu, { GenericPositionMenuHandle } from "../../../components/GenericPositionMenu.tsx";
import { TimelineAnalysisNodeData } from "../types/TimelineAnalysisNodeData.ts";
import BaseCardNode from "./BaseCardNode.tsx";
import TimelineAnalysisNodeViz from "./TimelineAnalysisNodeViz.tsx";

function TimelineAnalysisNode(props: NodeProps<TimelineAnalysisNodeData>) {
  // whiteboard state (react-flow)
  const readonly = !props.isConnectable;

  // refs
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);

  // global server state
  const timelineAnalysis = TimelineAnalysisHooks.useGetTimelineAnalysis(props.data.timelineAnalysisId);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      // Double click - could navigate to analysis page
      console.log("Double clicked timeline analysis node");
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    contextMenuRef.current?.open({
      top: e.clientY,
      left: e.clientX,
    });
  };

  return (
    <>
      <BaseCardNode
        nodeProps={props}
        allowDrawConnection={false}
        onClick={readonly ? undefined : handleClick}
        onContextMenu={readonly ? undefined : handleContextMenu}
        backgroundColor={props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0")}
      >
        {timelineAnalysis.isSuccess ? (
          <>
            <CardHeader title={`Timeline Analysis: ${timelineAnalysis.data.name}`} sx={{ pb: 1 }} />
            <CardContent style={{ padding: 8, paddingTop: 0 }}>
              <TimelineAnalysisNodeViz
                timelineAnalysis={timelineAnalysis.data}
                height={350}
                width={550}
                compact={true}
              />
            </CardContent>
          </>
        ) : timelineAnalysis.isError ? (
          <Typography variant="body2">{timelineAnalysis.error.message}</Typography>
        ) : (
          <Typography variant="body2">Loading timeline analysis...</Typography>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={() => contextMenuRef.current?.close()}>Go to Timeline Analysis</MenuItem>
      </GenericPositionMenu>
    </>
  );
}

export default TimelineAnalysisNode;
