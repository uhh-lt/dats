import { FolderHooks } from "@api/hooks/FolderHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { Icon, getIconComponent } from "@components/icons";
import { FolderRead } from "@models/FolderRead";
import { FolderType } from "@models/FolderType";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";

export interface FolderRendererSharedProps extends ExpandableRendererProps {
  renderName?: boolean;
  renderIcon?: boolean;
}

interface FolderRendererProps extends FolderRendererSharedProps {
  folder: number | FolderRead;
  folderType: FolderType;
}

export const FolderRenderer = memo(({ folder, folderType, ...props }: FolderRendererProps) => {
  if (typeof folder === "number") {
    if (folderType === FolderType.SDOC_FOLDER) {
      return <SdocFolderRendererWithoutData folderId={folder} {...props} />;
    }
    return <FolderRendererWithoutData folderId={folder} {...props} />;
  } else {
    return <FolderRendererWithData folder={folder} {...props} />;
  }
});

const FolderRendererWithoutData = memo(({ folderId, ...props }: { folderId: number } & FolderRendererSharedProps) => {
  const folder = FolderHooks.useGetFolder(folderId);

  if (folder.isSuccess) {
    return <FolderRendererWithData folder={folder.data} {...props} />;
  } else if (folder.isError) {
    return <div>{folder.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

const SdocFolderRendererWithoutData = memo(
  ({ folderId, ...props }: { folderId: number } & FolderRendererSharedProps) => {
    const folder = FolderHooks.useGetSdocFolder(folderId);

    if (folder.isSuccess) {
      return <FolderRendererWithData folder={folder.data} {...props} />;
    } else if (folder.isError) {
      return <div>{folder.error.message}</div>;
    } else {
      return <div>Loading...</div>;
    }
  },
);

const FolderRendererWithData = memo(
  ({ folder, renderName, renderIcon, ...expandProps }: { folder: FolderRead } & FolderRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<FolderContext folder={folder} />}>
        <Stack direction="row" alignItems="center" spacing={2} minWidth={0} maxWidth="100%" overflow="hidden">
          {renderIcon && getIconComponent(Icon.FOLDER, { style: { flexShrink: 0 } })}
          {renderName && (
            <Typography component="span" noWrap minWidth={0}>
              {folder.name}
            </Typography>
          )}
        </Stack>
      </ExpandableRenderer>
    );
  },
);

function FolderContext({ folder }: { folder: FolderRead }) {
  return (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {folder.name || "No name available."}
    </Typography>
  );
}
