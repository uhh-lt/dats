import { useMemo } from "react";
import SdocHooks from "../../api/SdocHooks.ts";
import { MetaType } from "../../api/openapi/models/MetaType.ts";
import { SourceDocumentMetadataReadResolved } from "../../api/openapi/models/SourceDocumentMetadataReadResolved.ts";
import { dateToLocaleDateString } from "../../utils/DateUtils.ts";

interface SdocMetadataRendererProps {
  sdocId: number;
  projectMetadataId: number;
}

function SdocMetadataRenderer({ sdocId, projectMetadataId }: SdocMetadataRendererProps) {
  const sdocMetadatas = SdocHooks.useGetMetadata(sdocId);

  // todo: this transformation causes a rerender :/
  const sdocMetadata = useMemo(() => {
    return sdocMetadatas.data?.find((metadata) => metadata.project_metadata.id === projectMetadataId);
  }, [sdocMetadatas.data, projectMetadataId]);

  if (sdocMetadatas.isSuccess && sdocMetadata !== undefined) {
    return <SdocMetadataRendererWithData sdocMetadata={sdocMetadata} />;
  } else if (sdocMetadatas.isSuccess && sdocMetadata === undefined) {
    return <i>empty</i>;
  } else if (sdocMetadatas.isError) {
    return <div>{sdocMetadatas.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

export function SdocMetadataRendererWithData({ sdocMetadata }: { sdocMetadata: SourceDocumentMetadataReadResolved }) {
  switch (sdocMetadata.project_metadata.metatype) {
    case MetaType.STRING:
      return <>{sdocMetadata.str_value ? sdocMetadata.str_value : <i>empty</i>}</>;
    case MetaType.NUMBER:
      return <>{sdocMetadata.int_value ? sdocMetadata.int_value : <i>empty</i>}</>;
    case MetaType.DATE:
      return <>{sdocMetadata.date_value ? dateToLocaleDateString(sdocMetadata.date_value) : <i>empty</i>}</>;
    case MetaType.BOOLEAN:
      return <>{sdocMetadata.boolean_value ? sdocMetadata.boolean_value : <i>empty</i>}</>;
    case MetaType.LIST:
      return <>{sdocMetadata.list_value ? sdocMetadata.list_value.join(", ") : <i>empty</i>}</>;
    default:
      return <>Unkown MetaType!</>;
  }
}

export default SdocMetadataRenderer;
