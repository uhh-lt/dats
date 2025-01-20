import { SentenceAnnotationReadResolved } from "../../../../api/openapi/models/SentenceAnnotationReadResolved.ts";

export const isAnnotationSame = (anno1: SentenceAnnotationReadResolved, anno2: SentenceAnnotationReadResolved) => {
  return (
    anno1.code.id === anno2.code.id &&
    anno1.sentence_id_start === anno2.sentence_id_start &&
    anno1.sentence_id_end === anno2.sentence_id_end
  );
};
