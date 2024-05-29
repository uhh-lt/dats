import parse, { DOMNode, Element, HTMLReactParserOptions, domToReact } from "html-react-parser";
import { useMemo } from "react";
import AnnotationBlock from "./AnnotationBlock.tsx";
import CodeBlock from "./CodeBlock.tsx";
import SdocBlock from "./SdocBlock.tsx";

const processingInstructions = (col: number, row: number): HTMLReactParserOptions => {
  const options: HTMLReactParserOptions = {
    replace(domNode, index) {
      if (domNode instanceof Element && domNode.attribs) {
        // code
        if (domNode.name === "code") {
          if (domNode.attribs.id) {
            const codeId = parseInt(domNode.attribs.id);
            return <CodeBlock key={`col-${col}-row-${row}-index-${index}-code-${codeId}`} codeId={codeId} />;
          } else {
            return <span key={`col-${col}-row-${row}-index-${index}`}>Code ?</span>;
          }
        }
        // sdoc
        else if (domNode.name === "sdoc") {
          if (domNode.attribs.id) {
            const sdocId = parseInt(domNode.attribs.id);
            return <SdocBlock key={`col-${col}-row-${row}-index-${index}-sdoc-${sdocId}`} sdocId={sdocId} />;
          } else {
            return <span key={`col-${col}-row-${row}-index-${index}`}>Document ?</span>;
          }
        }
        // annotation
        else if (domNode.name === "annotation") {
          if (domNode.attribs.sdocid && domNode.attribs.codeid) {
            const codeId = parseInt(domNode.attribs.codeid);
            const sdocId = parseInt(domNode.attribs.sdocid);
            return (
              <AnnotationBlock
                key={`col-${col}-row-${row}-index-${index}-sdoc-${sdocId}-code-${codeId}`}
                codeId={codeId}
                sdocId={sdocId}
                text={domToReact(domNode.children as DOMNode[], options)}
              />
            );
          } else {
            return <span key={`col-${col}-row-${row}-index-${index}`}>Annotation ?</span>;
          }
        }
        // anything else
        else {
          return domToReact(domNode.children as DOMNode[], options);
        }
      }
    },
  };
  return options;
};

interface CustomHTMLCellRendererProps {
  col?: number;
  row?: number;
  value?: string;
}

function CustomHTMLCellRenderer(props: CustomHTMLCellRendererProps) {
  const renderedTokens = useMemo(() => {
    if (!props.col || !props.row || !props.value) return null;

    return parse(props.value, processingInstructions(props.col, props.row));
  }, [props.col, props.row, props.value]);

  return <>{renderedTokens}</>;
}

export default CustomHTMLCellRenderer;
