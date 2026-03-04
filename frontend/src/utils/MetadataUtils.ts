import { MetaType } from "@api/models/MetaType";
import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import { dateToLocaleYYYYMMDDString } from "./DateUtils";

export const getValue = (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
  switch (projectMetadata.metatype) {
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
