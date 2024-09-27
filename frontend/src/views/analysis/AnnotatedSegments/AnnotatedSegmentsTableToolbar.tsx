import SATToolbar, { SATToolbarProps } from "../../../components/SpanAnnotation/SpanAnnotationTable/SATToolbar.tsx";
import ExportAnnotationsButton from "./ExportAnnotationsButton.tsx";

function AnnotatedSegmentsTableToolbar(props: SATToolbarProps) {
  return (
    <SATToolbar
      {...props}
      rightChildren={<ExportAnnotationsButton spanAnnotationIds={props.selectedAnnotations.map((a) => a.id)} />}
    />
  );
}

export default AnnotatedSegmentsTableToolbar;
