import { FolderHooks } from "@api/hooks/FolderHooks";
import { SdocHooks } from "@api/hooks/SdocHooks";
import { FolderRenderer, FolderRootRenderer } from "@core/folder";
import { FolderType } from "@models/FolderType";

interface SharedProps {
  renderName?: boolean;
  renderIcon?: boolean;
}

interface SdocFolderRendererProps {
  sdocId?: number;
}

export function SdocFolderRenderer({ sdocId, ...props }: SdocFolderRendererProps & SharedProps) {
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const sdocFolder = FolderHooks.useGetSdocFolder(sdoc.data?.folder_id);

  if (sdoc.data && sdocFolder.data && sdocFolder.data.parent_id) {
    return <FolderRenderer folder={sdocFolder.data.parent_id} folderType={FolderType.NORMAL} {...props} />;
  } else if (sdoc.data && sdocFolder.data) {
    return <FolderRootRenderer projectId={sdoc.data?.project_id} {...props} />;
  } else if (sdoc.isError) {
    return <div>{sdoc.error.message}</div>;
  } else if (sdocFolder.isError) {
    return <div>{sdocFolder.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}
