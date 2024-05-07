import { useMemo } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import MemoRenderer2 from "../../../components/DataGrid/MemoRenderer2.tsx";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../components/DataGrid/SdocTagRenderer.tsx";

function SdocTable({ sdocIds }: { sdocIds: number[] }) {
  // global client state (react router)
  const { user } = useAuth();

  const data = useMemo(() => sdocIds.map((sdocId) => ({ id: sdocId })), [sdocIds]);

  // computed
  const columns: GridColDef<{ id: number }>[] = useMemo(
    () => [
      {
        field: "Type",
        headerName: "Type",
        flex: 1,
        renderCell: (params) => <SdocRenderer sdoc={params.row.id} renderDoctypeIcon />,
      },
      {
        field: "Filename",
        headerName: "Document",
        flex: 2,
        renderCell: (params) => <SdocRenderer sdoc={params.row.id} link renderFilename />,
      },
      {
        field: "Tags",
        headerName: "Tags",
        flex: 2,
        renderCell: (params) => <SdocTagsRenderer sdocId={params.row.id} />,
      },
      {
        field: "Memo",
        headerName: "Memo",
        flex: 3,
        description: "Your comments on the document",
        renderCell: (params) =>
          user ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
              attachedObjectId={params.row.id}
              userId={user.id}
              showTitle={false}
              showContent
              showIcon={false}
            />
          ) : null,
      },
    ],
    [user],
  );

  return (
    <DataGrid
      rows={data}
      columns={columns}
      autoPageSize
      getRowId={(row) => row.id}
      style={{ border: "none" }}
      disableColumnFilter
    />
  );
}

export default SdocTable;
