import { MetaType } from "../../api/openapi/models/MetaType.ts";
import { SourceDocumentMetadataReadResolved } from "../../api/openapi/models/SourceDocumentMetadataReadResolved.ts";
import { dateToLocaleYYYYMMDDString } from "../../utils/DateUtils.ts";

export const getValue = (metadata: SourceDocumentMetadataReadResolved) => {
  switch (metadata.project_metadata.metatype) {
    case MetaType.STRING:
      return metadata.str_value;
    case MetaType.NUMBER:
      return metadata.int_value;
    case MetaType.DATE:
      return metadata.date_value ? dateToLocaleYYYYMMDDString(metadata.date_value) : metadata.date_value;
    case MetaType.LIST:
      return metadata.list_value;
    case MetaType.BOOLEAN:
      return metadata.boolean_value;
  }
};
