// @ts-ignore
import { Parser } from "html-to-react";
// @ts-ignore
import * as HtmlToReact from "html-to-react";
import React, { useMemo } from "react";
import CodeBlock from "./CodeBlock";
import SdocBlock from "./SdocBlock";
import AnnotationBlock from "./AnnotationBlock";

const htmlToReactParser = new Parser();
const processNodeDefinitions = new HtmlToReact.ProcessNodeDefinitions(React);

const processingInstructions = (col: number, row: number) => [
  {
    shouldProcessNode: function (node: any) {
      return node.name === "code";
    },
    processNode: function (node: any, children: any, index: any) {
      if (node.attribs.id) {
        const codeId = parseInt(node.attribs.id);
        return <CodeBlock key={`col-${col}-row-${row}-index-${index}-code-${codeId}`} codeId={codeId} />;
      } else {
        return <span key={`col-${col}-row-${row}-index-${index}`}>Code ?</span>;
      }
    },
  },
  {
    shouldProcessNode: function (node: any) {
      return node.name === "sdoc";
    },
    processNode: function (node: any, children: any, index: any) {
      if (node.attribs.id) {
        const sdocId = parseInt(node.attribs.id);
        return <SdocBlock key={`col-${col}-row-${row}-index-${index}-sdoc-${sdocId}`} sdocId={sdocId} />;
      } else {
        return <span key={`col-${col}-row-${row}-index-${index}`}>Document ?</span>;
      }
    },
  },
  {
    shouldProcessNode: function (node: any) {
      return node.name === "annotation";
    },
    processNode: function (node: any, children: any, index: any) {
      if (node.attribs.sdocid && node.attribs.codeid) {
        const codeId = parseInt(node.attribs.codeid);
        const sdocId = parseInt(node.attribs.sdocid);
        return (
          <AnnotationBlock
            key={`col-${col}-row-${row}-index-${index}-sdoc-${sdocId}-code-${codeId}`}
            codeId={codeId}
            sdocId={sdocId}
            text={children}
          />
        );
      } else {
        return <span key={`col-${col}-row-${row}-index-${index}`}>Annotation ?</span>;
      }
    },
  },
  {
    // Anything else
    shouldProcessNode: function (node: any) {
      return true;
    },
    processNode: processNodeDefinitions.processDefaultNode,
  },
];

const isValidNode = function () {
  return true;
};

function CustomHTMLCellRenderer(props: any) {
  const renderedTokens = useMemo(() => {
    return htmlToReactParser.parseWithInstructions(
      props.value,
      isValidNode,
      processingInstructions(props.col, props.row)
    );
  }, [props.col, props.row, props.value]);

  return <>{renderedTokens}</>;
}

export default CustomHTMLCellRenderer;
