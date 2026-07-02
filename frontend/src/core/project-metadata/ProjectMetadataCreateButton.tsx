import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { SdocHooks } from "@api/hooks/SdocHooks";
import { Icon, getIconComponent } from "@components/icons";
import { DocType } from "@models/DocType";
import { MetaType } from "@models/MetaType";
import { Button, PopoverPosition } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { MouseEvent, memo, useCallback, useState } from "react";
import { MetadataTypeSelectorMenu } from "./_components/MetadataTypeSelectorMenu";

interface ProjectMetadataCreateButtonProps {
  sdocId?: number;
  docType?: DocType;
}

export const ProjectMetadataCreateButton = memo(({ sdocId, docType }: ProjectMetadataCreateButtonProps) => {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (docType !== undefined) {
    return <MetadataCreateButtonContent docType={docType} />;
  }
  if (sdocId !== undefined) {
    return <MetadataCreateButtonContent docType={sdoc.data?.doctype} />;
  }
  return <>Error: Missing document ID or DocType</>;
});

function MetadataCreateButtonContent({ docType }: { docType: DocType | undefined }) {
  const [position, setPosition] = useState<PopoverPosition | undefined>();

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const boundingBox = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: boundingBox.left,
      top: boundingBox.top + boundingBox.height,
    });
  }, []);

  const handleClose = useCallback(() => {
    setPosition(undefined);
  }, []);

  // create
  const projectId = useAppSelector((state) => state.project.projectId);
  const { mutate: createMetadataMutation } = MetadataHooks.useCreateProjectMetadata();

  const handleCreateMetadata = useCallback(
    (metaType: string) => {
      if (!docType || !projectId) return;

      createMetadataMutation({
        requestBody: {
          doctype: docType,
          metatype: metaType as MetaType,
          key: `${metaType.toLowerCase()} (new)`,
          project_id: projectId,
          read_only: false,
          description: "Placeholder description",
        },
      });
    },
    [createMetadataMutation, docType, projectId],
  );

  return (
    <>
      <Button variant="text" size="small" startIcon={getIconComponent(Icon.ADD)} onClick={handleClick}>
        Add Metadata
      </Button>
      <MetadataTypeSelectorMenu
        placeholder="Add new metadata..."
        position={position}
        handleClose={handleClose}
        handleMenuItemClick={handleCreateMetadata}
      />
    </>
  );
}
