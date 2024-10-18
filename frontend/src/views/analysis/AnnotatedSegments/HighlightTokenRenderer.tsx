import { useMemo } from "react";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";

interface HighlightTokenRendererProps {
  beginToken: number;
  endToken: number;
  contextSize: number;
  sdocData: SourceDocumentDataRead;
}

function HighlightTokenRenderer({ beginToken, endToken, contextSize, sdocData }: HighlightTokenRendererProps) {
  const tokens = sdocData.tokens;
  const { textBefore, textHighlight, textAfter } = useMemo(() => {
    const textBefore = tokens.slice(beginToken - contextSize, beginToken).join(" ");
    const textHighlight = tokens.slice(beginToken, endToken).join(" ");
    const textAfter = tokens.slice(endToken, endToken + contextSize).join(" ");
    return { textBefore, textHighlight, textAfter };
  }, [tokens, beginToken, endToken, contextSize]);
  return (
    <>
      {textBefore} <strong>{textHighlight}</strong> {textAfter}
    </>
  );
}

export default HighlightTokenRenderer;
