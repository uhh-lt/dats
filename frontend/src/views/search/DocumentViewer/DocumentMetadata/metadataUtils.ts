import { MetaType, SourceDocumentMetadataReadResolved } from "../../../../api/openapi";

export const getValue = (metadata: SourceDocumentMetadataReadResolved) => {
  switch (metadata.project_metadata.metatype) {
    case MetaType.STRING:
      return metadata.str_value;
    case MetaType.NUMBER:
      return metadata.int_value;
    case MetaType.DATE:
      return metadata.date_value;
    case MetaType.LIST:
      return metadata.list_value;
    case MetaType.BOOLEAN:
      return metadata.boolean_value;
  }
};
