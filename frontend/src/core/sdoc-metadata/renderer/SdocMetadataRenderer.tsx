import { ProjectMetadataHooks } from "@core/project-metadata";
import { MetaType } from "@models/MetaType";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { formatDateOnly } from "@utils/DateUtils";
import { memo } from "react";
import { SdocMetadataHooks } from "../api/sdocMetadataHooks";

interface SdocMetadataRendererProps {
  sdocId: number;
  projectMetadataId: number;
}

export const SdocMetadataRenderer = memo(({ sdocId, projectMetadataId }: SdocMetadataRendererProps) => {
  const sdocMetadata = SdocMetadataHooks.useGetSdocMetadataByProjectMetadataId(sdocId, projectMetadataId);
  const projectMetadata = ProjectMetadataHooks.useGetProjectMetadata(projectMetadataId);

  if (projectMetadata.isSuccess && sdocMetadata.isSuccess && sdocMetadata.data !== undefined) {
    return <SdocMetadataRendererWithData sdocMetadata={sdocMetadata.data} projectMetadata={projectMetadata.data} />;
  } else if (sdocMetadata.isSuccess && sdocMetadata.data === undefined) {
    return <i>empty</i>;
  } else if (sdocMetadata.isError) {
    return <div>{sdocMetadata.error.message}</div>;
  } else if (projectMetadata.isError) {
    return <div>{projectMetadata.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

export const SdocMetadataRendererWithData = memo(
  ({
    sdocMetadata,
    projectMetadata,
  }: {
    sdocMetadata: SourceDocumentMetadataRead;
    projectMetadata: ProjectMetadataRead;
  }) => {
    switch (projectMetadata.metatype) {
      case MetaType.STRING:
        return <>{sdocMetadata.str_value ? sdocMetadata.str_value : <i>empty</i>}</>;
      case MetaType.NUMBER:
        return <>{sdocMetadata.int_value ? sdocMetadata.int_value : <i>empty</i>}</>;
      case MetaType.DATE:
        return <>{sdocMetadata.date_value ? formatDateOnly(sdocMetadata.date_value) : <i>empty</i>}</>;
      case MetaType.BOOLEAN:
        return <>{sdocMetadata.boolean_value ? sdocMetadata.boolean_value : <i>empty</i>}</>;
      case MetaType.LIST:
        return <>{sdocMetadata.list_value ? sdocMetadata.list_value.join(", ") : <i>empty</i>}</>;
      default:
        return <>Unknown MetaType!</>;
    }
  },
);
