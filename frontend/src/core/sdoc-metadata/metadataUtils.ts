import { MetaType } from "@models/MetaType";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import { dateToLocaleYYYYMMDDString } from "@utils/DateUtils";

export const getMetadataValue = (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
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
