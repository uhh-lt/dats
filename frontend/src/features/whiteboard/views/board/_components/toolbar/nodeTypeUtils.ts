import { BorderStyle } from "@api/models/BorderStyle";
import { HorizontalAlign } from "@api/models/HorizontalAlign";
import { VerticalAlign } from "@api/models/VerticalAlign";
import { WhiteboardNodeType } from "@api/models/WhiteboardNodeType";
import { BackgroundColorData } from "../../_types/base/BackgroundColorData";
import { BorderData } from "../../_types/base/BorderData";
import { TextData } from "../../_types/base/TextData";
import { NodeType } from "./tools/NodeType";

// Helper to extract a property from an object, or return a default value if the property is undefined
export function getOrDefault<T, K extends keyof T>(obj: Partial<T>, key: K, defaultValue: T[K]): T[K] {
  return obj[key] !== undefined ? obj[key]! : defaultValue;
}

const nodeTypeToWhiteboardNodeTypeMap: Record<NodeType, WhiteboardNodeType> = {
  [NodeType.TEXT]: WhiteboardNodeType.TEXT,
  [NodeType.NOTE]: WhiteboardNodeType.NOTE,
  [NodeType.ELLIPSE]: WhiteboardNodeType.BORDER,
  [NodeType.RECTANGLE]: WhiteboardNodeType.BORDER,
  [NodeType.ROUNDED]: WhiteboardNodeType.BORDER,
};

// Function to create new node data based on node type and existing data
export function createNodeDataByType(
  oldData: Partial<TextData & BorderData & BackgroundColorData>,
  nodeType: NodeType,
) {
  // Get common properties that might exist in the current node
  const commonProps = {
    type: nodeTypeToWhiteboardNodeTypeMap[nodeType],
    text: getOrDefault(oldData, "text", "New Text"),
    color: getOrDefault(oldData, "color", "#000000"),
    fontSize: getOrDefault(oldData, "fontSize", 12),
    fontFamily: getOrDefault(oldData, "fontFamily", "Arial"),
    horizontalAlign: getOrDefault(oldData, "horizontalAlign", HorizontalAlign.LEFT),
    verticalAlign: getOrDefault(oldData, "verticalAlign", VerticalAlign.TOP),
    bold: getOrDefault(oldData, "bold", false),
    italic: getOrDefault(oldData, "italic", false),
    underline: getOrDefault(oldData, "underline", false),
    strikethrough: getOrDefault(oldData, "strikethrough", false),
  };

  // Create new data based on node type
  let newData;
  switch (nodeType) {
    case "text": {
      newData = {
        ...commonProps,
      };
      break;
    }
    case "note": {
      newData = {
        ...commonProps,
        bgcolor: getOrDefault(oldData, "bgcolor", "#ffffff"),
        bgalpha: getOrDefault(oldData, "bgalpha", 255),
      };
      break;
    }
    case "ellipse": {
      newData = {
        ...commonProps,
        bgcolor: getOrDefault(oldData, "bgcolor", "#ffffff"),
        bgalpha: getOrDefault(oldData, "bgalpha", 255),
        borderRadius: "100%",
        borderColor: getOrDefault(oldData, "borderColor", "#000000"),
        borderWidth: getOrDefault(oldData, "borderWidth", 1),
        borderStyle: getOrDefault(oldData, "borderStyle", BorderStyle.SOLID),
        width: 200,
        height: 200,
      };
      break;
    }
    case "rectangle": {
      newData = {
        ...commonProps,
        bgcolor: getOrDefault(oldData, "bgcolor", "#ffffff"),
        bgalpha: getOrDefault(oldData, "bgalpha", 255),
        borderColor: getOrDefault(oldData, "borderColor", "#000000"),
        borderWidth: getOrDefault(oldData, "borderWidth", 1),
        borderStyle: getOrDefault(oldData, "borderStyle", BorderStyle.SOLID),
        borderRadius: "0px",
        width: 200,
        height: 200,
      };
      break;
    }
    case "rounded": {
      newData = {
        ...commonProps,
        bgcolor: getOrDefault(oldData, "bgcolor", "#ffffff"),
        bgalpha: getOrDefault(oldData, "bgalpha", 255),
        borderColor: getOrDefault(oldData, "borderColor", "#000000"),
        borderWidth: getOrDefault(oldData, "borderWidth", 1),
        borderStyle: getOrDefault(oldData, "borderStyle", BorderStyle.SOLID),
        borderRadius: "25px",
        width: 200,
        height: 200,
      };
      break;
    }
    default: {
      newData = commonProps;
      break;
    }
  }

  return {
    newData,
    nodeType: nodeTypeToWhiteboardNodeTypeMap[nodeType],
    dimensions:
      nodeType === NodeType.ELLIPSE || nodeType === NodeType.RECTANGLE || nodeType === NodeType.ROUNDED
        ? { width: 200, height: 200 }
        : undefined,
  };
}
