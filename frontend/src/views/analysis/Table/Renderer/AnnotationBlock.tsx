import CodeBlock from "./CodeBlock";
import SdocBlock from "./SdocBlock";

interface AnnotationBlockProps {
  sdocId: number;
  codeId: number;
  text: string;
}

function AnnotationBlock({ sdocId, codeId, text }: AnnotationBlockProps) {
  return (
    <>
      {'"'}
      {text}
      {'"'}
      {" ("}
      <CodeBlock codeId={codeId} />
      {", "}
      <SdocBlock sdocId={sdocId} />
      {")"}
    </>
  );
}

export default AnnotationBlock;
