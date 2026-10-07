import { FolderHooks } from "@api/hooks/FolderHooks";
import { sdocQueries } from "@api/queries/sdocQueries";
import { FolderRenderer, FolderRootRenderer } from "@core/folder";
import { FolderType } from "@models/FolderType";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";

interface SdocFolderRendererProps {
  sdocId?: number;
  renderName?: boolean;
  renderIcon?: boolean;
}

export const SdocFolderRenderer = memo(({ sdocId, ...props }: SdocFolderRendererProps) => {
  const sdoc = useQuery(sdocQueries.detail(sdocId));
  const sdocFolder = FolderHooks.useGetSdocFolder(sdoc.data?.folder_id);

  if (sdoc.isSuccess && sdocFolder.isSuccess && sdocFolder.data.parent_id) {
    return <FolderRenderer folder={sdocFolder.data.parent_id} folderType={FolderType.NORMAL} {...props} />;
  } else if (sdoc.isSuccess && sdocFolder.isSuccess) {
    return <FolderRootRenderer projectId={sdoc.data.project_id} {...props} />;
  } else if (sdoc.isError) {
    return <div>{sdoc.error.message}</div>;
  } else if (sdocFolder.isError) {
    return <div>{sdocFolder.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});
