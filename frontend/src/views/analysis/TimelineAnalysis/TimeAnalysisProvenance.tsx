import InfoIcon from "@mui/icons-material/Info";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { AttachedObjectType } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import MemoRenderer2 from "../../../components/DataGrid/MemoRenderer2";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer";
import SdocTagsRenderer from "../../../components/DataGrid/SdocTagRenderer";
import { useAppSelector } from "../../../plugins/ReduxHooks";

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
          user.data ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
              attachedObjectId={params.row.id}
              userId={user.data.id}
              showTitle={false}
              showContent
              showIcon={false}
            />
          ) : null,
      },
    ],
    [user.data],
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

export default TimeAnalysisProvenance;
