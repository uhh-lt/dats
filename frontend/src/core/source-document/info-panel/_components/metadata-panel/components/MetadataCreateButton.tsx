import { Button, PopoverPosition } from "@mui/material";
import { useAppSelector } from "@plugins/redux";
import { MouseEvent, memo, useCallback, useState } from "react";
import { MetadataHooks } from "../../../../../../api/MetadataHooks";
import { SdocHooks } from "../../../../../../api/SdocHooks";
import { DocType } from "../../../../../../api/openapi/models/DocType";
import { MetaType } from "../../../../../../api/openapi/models/MetaType";
import { Icon, getIconComponent } from "../../../../../../utils/icons/iconUtils";
import { MetadataTypeSelectorMenu } from "./MetadataTypeSelectorMenu";

interface MetadataCreateButtonProps {
  sdocId?: number;
  docType?: DocType;
}

export const MetadataCreateButton = memo(({ sdocId, docType }: MetadataCreateButtonProps) => {
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
