import { Stack, StackProps, Typography } from "@mui/material";
import FolderHooks from "../../api/FolderHooks.ts";
import { FolderRead } from "../../api/openapi/models/FolderRead.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";

interface FolderRendererProps {
  folder: number | FolderRead;
}

function FolderRenderer({ folder, ...props }: FolderRendererProps & Omit<StackProps, "direction" | "alignItems">) {
  if (typeof folder === "number") {
    return <FolderRendererWithoutData folderId={folder} {...props} />;
  } else {
    return <FolderRendererWithData folder={folder} {...props} />;
  }
}

function FolderRendererWithoutData({
  folderId,
  ...props
}: { folderId: number } & Omit<StackProps, "direction" | "alignItems">) {
  const folder = FolderHooks.useGetFolder(folderId);

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
  ...props
}: { folder: FolderRead } & Omit<StackProps, "direction" | "alignItems">) {
  return (
    <Stack spacing={1} direction="row" alignItems="center" {...props}>
      {getIconComponent(Icon.FOLDER)}
      <Typography>{folder.name}</Typography>
    </Stack>
  );
}

export default FolderRenderer;
