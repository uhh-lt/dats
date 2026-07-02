import { FolderHooks } from "@api/hooks/FolderHooks";
import { FolderRead } from "@api/models/FolderRead";
import { FolderType } from "@api/models/FolderType";
import { Icon, getIconComponent } from "@components/icons";
import { Stack, Typography } from "@mui/material";

interface FolderRendererSharedProps {
  renderName?: boolean;
  renderIcon?: boolean;
}

interface FolderRendererProps extends FolderRendererSharedProps {
  folder: number | FolderRead;
  folderType: FolderType;
}

export function FolderRenderer({ folder, folderType, ...props }: FolderRendererProps) {
  if (typeof folder === "number") {
    if (folderType === FolderType.SDOC_FOLDER) {
      return <SdocFolderRendererWithoutData folderId={folder} {...props} />;
    }
    return <FolderRendererWithoutData folderId={folder} {...props} />;
  } else {
    return <FolderRendererWithData folder={folder} {...props} />;
  }
}

function FolderRendererWithoutData({ folderId, ...props }: { folderId: number } & FolderRendererSharedProps) {
  const folder = FolderHooks.useGetFolder(folderId);

  if (folder.data) {
    return <FolderRendererWithData folder={folder.data} {...props} />;
  } else if (folder.isError) {
    return <div>{folder.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocFolderRendererWithoutData({ folderId, ...props }: { folderId: number } & FolderRendererSharedProps) {
  const folder = FolderHooks.useGetSdocFolder(folderId);

  if (folder.data) {
    return <FolderRendererWithData folder={folder.data} {...props} />;
  } else if (folder.isError) {
    return <div>{folder.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function FolderRendererWithData({
  folder,
  renderName,
  renderIcon,
}: { folder: FolderRead } & FolderRendererSharedProps) {
  return (
    <Stack spacing={2} direction="row" alignItems="center" width="100%">
      {renderIcon && getIconComponent(Icon.FOLDER)}
      {renderName && <Typography>{folder.name}</Typography>}
    </Stack>
  );
}
