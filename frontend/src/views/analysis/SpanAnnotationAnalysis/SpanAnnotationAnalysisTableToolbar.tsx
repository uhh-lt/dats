import SATToolbar, { SATToolbarProps } from "../../../components/SpanAnnotation/SpanAnnotationTable/SATToolbar.tsx";
import ExportSpanAnnotationsButton from "./ExportSpanAnnotationsButton.tsx";

function SpanAnnotationsTableToolbar(props: SATToolbarProps) {
  return (
    <SATToolbar
      {...props}
      rightChildren={<ExportSpanAnnotationsButton spanAnnotationIds={props.selectedAnnotations.map((a) => a.id)} />}
    />
  );
}

export default SpanAnnotationsTableToolbar;
