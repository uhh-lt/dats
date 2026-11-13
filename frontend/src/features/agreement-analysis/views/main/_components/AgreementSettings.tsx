import { useNavigationTitle } from "@core/navigation";
import { AgreementScoringSelector } from "@components/AgreementScoringSelector";
import { CodeSelector } from "@core/code";
import { SdocSelectionDialog } from "@core/source-document";
import { useURLConnector } from "@hooks/useURLConnector";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import {
  CardContent,
  CardHeader,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { CardContainer } from "@components/CardContainer";
import { AgreementAnalysisRouteAPI } from "../_hooks/agreementAnalysisRouteAPI";
import { AgreementAnnotationTypeSelector } from "./AgreementAnnotationTypeSelector";
import { AgreementCountsExportButton } from "./AgreementCountsExportButton";
import { AnnotatorSelector } from "./AnnotatorSelector";
import { AgreementParams } from "@models/AgreementParams";

interface AgreementSettingsProps {
  params: AgreementParams | undefined;
}

export function AgreementSettings({ params }: AgreementSettingsProps) {
  const title = useNavigationTitle() ?? "";
  // global client state (URL)
  const projectId = AgreementAnalysisRouteAPI.useParams({ select: (urlParams) => urlParams.projectId });
  const navigate = AgreementAnalysisRouteAPI.useNavigate();
  const [referenceUserId, setReferenceUserId] = useURLConnector(AgreementAnalysisRouteAPI, "referenceUserId");
  const [comparedUserId, setComparedUserId] = useURLConnector(AgreementAnalysisRouteAPI, "comparedUserId");
  const [annotationType, setAnnotationType] = useURLConnector(AgreementAnalysisRouteAPI, "annotationType");
  const [scoring, setScoring] = useURLConnector(AgreementAnalysisRouteAPI, "scoring");
  const [sdocIds, setSdocIds] = useURLConnector(AgreementAnalysisRouteAPI, "sdocIds");
  const [codeIds, setCodeIds] = useURLConnector(AgreementAnalysisRouteAPI, "codeIds");
  const [hideUnusedCodes, setHideUnusedCodes] = useURLConnector(AgreementAnalysisRouteAPI, "hideUnusedCodes");

  // handlers (for ui)
  const handleSwap = () => {
    navigate({
      search: (prev) => ({ ...prev, referenceUserId: prev.comparedUserId, comparedUserId: prev.referenceUserId }),
      replace: true,
    });
  };

  return (
    <CardContainer>
      <CardHeader
        title={title}
        subheader="Compare a reference annotator (gold standard) with another annotator."
        action={<AgreementCountsExportButton params={params} />}
      />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <AnnotatorSelector
              title="Reference annotator"
              userId={referenceUserId}
              onUserIdChange={setReferenceUserId}
              fullWidth
            />
            <Tooltip title="Swap annotators">
              <span>
                <IconButton
                  aria-label="Swap annotators"
                  onClick={handleSwap}
                  disabled={referenceUserId === undefined && comparedUserId === undefined}
                >
                  <SwapHorizIcon />
                </IconButton>
              </span>
            </Tooltip>
            <AnnotatorSelector
              title="Compared annotator"
              userId={comparedUserId}
              onUserIdChange={setComparedUserId}
              fullWidth
            />
          </Stack>
          <Stack direction="row" gap={1}>
            <AgreementAnnotationTypeSelector
              annotationType={annotationType}
              onAnnotationTypeChange={setAnnotationType}
              fullWidth
            />
            <AgreementScoringSelector
              annotationType={annotationType}
              scoring={scoring}
              onScoringChange={setScoring}
              fullWidth
            />
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <SdocSelectionDialog
              projectId={projectId}
              filterName="agreementDocuments"
              title="Select the documents to compare"
              sdocIds={sdocIds}
              onChange={setSdocIds}
              buttonProps={{ variant: "outlined" }}
            />
            <Typography variant="body2" color="textSecondary">
              {sdocIds.length === 0
                ? "Select the documents to compare."
                : `The annotators are compared on ${sdocIds.length} document(s).`}
            </Typography>
          </Stack>
          <CodeSelector
            multiple
            showSelectAll
            title="Codes"
            placeholder="Search codes"
            value={codeIds}
            onChange={setCodeIds}
            size="small"
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={hideUnusedCodes}
                onChange={(event) => setHideUnusedCodes(event.target.checked)}
              />
            }
            label="Hide codes without annotations in scores and confusion matrix"
          />
        </Stack>
      </CardContent>
    </CardContainer>
  );
}
