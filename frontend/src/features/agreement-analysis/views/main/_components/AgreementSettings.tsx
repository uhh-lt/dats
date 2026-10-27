import { CodeSelector } from "@core/code";
import { TagSelector } from "@core/tag";
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
import { AgreementScoringSelector } from "./AgreementScoringSelector";
import { AnnotatorSelector } from "./AnnotatorSelector";
import { AgreementParams } from "@models/AgreementParams";

interface AgreementSettingsProps {
  numSdocs: number | undefined;
  params: AgreementParams | undefined;
}

export function AgreementSettings({ numSdocs, params }: AgreementSettingsProps) {
  // global client state (URL)
  const navigate = AgreementAnalysisRouteAPI.useNavigate();
  const [referenceUserId, setReferenceUserId] = useURLConnector(AgreementAnalysisRouteAPI, "referenceUserId");
  const [comparedUserId, setComparedUserId] = useURLConnector(AgreementAnalysisRouteAPI, "comparedUserId");
  const [annotationType, setAnnotationType] = useURLConnector(AgreementAnalysisRouteAPI, "annotationType");
  const [scoring, setScoring] = useURLConnector(AgreementAnalysisRouteAPI, "scoring");
  const [tagIds, setTagIds] = useURLConnector(AgreementAnalysisRouteAPI, "tagIds");
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
        title="Annotator Agreement"
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
          <Stack spacing={0.5}>
            <TagSelector
              multiple
              title="Documents with tag(s)"
              tagIds={tagIds}
              onTagIdChange={setTagIds}
              size="small"
            />
            <Typography variant="caption" color="textSecondary">
              {tagIds.length === 0
                ? "Select the tags of the documents to compare."
                : numSdocs === undefined
                  ? "Loading documents..."
                  : `${numSdocs} document(s) carry at least one of the tags.`}
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
