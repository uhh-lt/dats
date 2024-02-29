import CodeBlock from "./CodeBlock.tsx";
import SdocBlock from "./SdocBlock.tsx";

interface AnnotationBlockProps {
  sdocId: number;
  codeId: number;
  text: string | React.JSX.Element | React.JSX.Element[];
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
