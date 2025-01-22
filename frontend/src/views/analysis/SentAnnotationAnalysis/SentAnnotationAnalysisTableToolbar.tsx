import SEATToolbar, {
  SEATToolbarProps,
} from "../../../components/SentenceAnnotation/SentenceAnnotationTable/SEATToolbar.tsx";
import ExportSentAnnotationsButton from "./ExportSentAnnotationsButton.tsx";

function SentAnnotationsTableToolbar(props: SEATToolbarProps) {
  return (
    <SEATToolbar
      {...props}
      rightChildren={<ExportSentAnnotationsButton sentAnnotationIds={props.selectedAnnotations.map((a) => a.id)} />}
    />
  );
}

export default SentAnnotationsTableToolbar;
