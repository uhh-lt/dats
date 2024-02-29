import InfoIcon from "@mui/icons-material/Info";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import { MRT_ColumnDef, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useMemo } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import MemoRenderer2 from "../../../components/DataGrid/MemoRenderer2.tsx";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../components/DataGrid/SdocTagRenderer.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface TimeAnalysisProvenanceProps {
  provenanceData: Record<string, Record<string, number[]>>;
}

function TimeAnalysisProvenance({ provenanceData }: TimeAnalysisProvenanceProps) {
  // redux
  const date = useAppSelector((state) => state.timelineAnalysis.provenanceDate);
  const concept = useAppSelector((state) => state.timelineAnalysis.provenanceConcept);

  const provenance = useMemo(() => {
    if (!date || !concept || !provenanceData[date] || !provenanceData[date][concept]) {
      return [];
    }

    return provenanceData[date][concept];
  }, [provenanceData, date, concept]);

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title={`Provenance for ${concept} in ${date}`}
        subheader="Investigate the Timeline Analysis."
      />
      <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
        <SdocTable sdocIds={provenance} />
      </CardContent>
    </Card>
  );
}

function SdocTable({ sdocIds }: { sdocIds: number[] }) {
  // global client state (react router)
  const { user } = useAuth();

  const data = useMemo(() => sdocIds.map((sdocId) => ({ id: sdocId })), [sdocIds]);

  // computed
  const columns: MRT_ColumnDef<{ id: number }>[] = useMemo(
    () => [
      {
        accessorKey: "Type",
        header: "Type",
        flex: 1,
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderDoctypeIcon />,
      },
      {
        accessorKey: "Filename",
        header: "Document",
        flex: 2,
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} link renderFilename />,
      },
      {
        accessorKey: "Tags",
        header: "Tags",
        flex: 2,
        Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.id} />,
      },
      {
        accessorKey: "Memo",
        header: "Memo",
        flex: 3,
        description: "Your comments on the document",
        Cell: ({ row }) =>
          user ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
              attachedObjectId={row.original.id}
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

  // table
  const table = useMaterialReactTable({
    columns,
    data,
    getRowId: (row) => row.id.toString(),
    enableColumnFilters: false,
  });
  return <MaterialReactTable table={table} />;
}

export default TimeAnalysisProvenance;
