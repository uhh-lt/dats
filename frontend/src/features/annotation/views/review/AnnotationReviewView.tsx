import { AnnotationGovernanceHooks } from "@api/hooks/AnnotationGovernanceHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { CodeBranchHooks } from "@api/hooks/CodeBranchHooks";
import { UserHooks } from "@api/hooks/UserHooks";
import { CodeRenderer } from "@core/code";
import { useOpenConfirmationDialog } from "@core/notification";
import { SdocRenderer } from "@core/source-document/renderer/SdocRenderer";
import { AnnotationReviewAction } from "@models/AnnotationReviewAction";
import { AnnotationReviewItem } from "@models/AnnotationReviewItem";
import { AnnotationReviewType } from "@models/AnnotationReviewType";
import { CodeRead } from "@models/CodeRead";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

interface AnnotationReviewViewProps {
  projectId: number;
  branchId: number | null;
  codeId?: number;
  onBranchChange: (branchId: number | null) => void;
}

const PAGE_SIZE = 25;

export function AnnotationReviewView({ projectId, branchId, codeId, onBranchChange }: AnnotationReviewViewProps) {
  const users = UserHooks.useGetAllUsers();
  const visibleCodes = CodeHooks.useGetEnabledCodes(branchId);
  const branches = CodeBranchHooks.useListBranches(projectId);
  const branchName = branchId === null ? "Main" : branches.data?.find((branch) => branch.id === branchId)?.name;
  const reviewScope = branchId === null ? "Main" : `Main or ${branchName ?? "the selected branch"}`;
  const resolveReview = AnnotationGovernanceHooks.useResolveReview();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const [annotationType, setAnnotationType] = useState<AnnotationReviewType>(AnnotationReviewType.SPAN);
  const [userId, setUserId] = useState<number>();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number>();
  const [replacementCodeId, setReplacementCodeId] = useState<number>();
  const reviews = AnnotationGovernanceHooks.useReviews({
    projectId,
    annotationType,
    page,
    pageSize: PAGE_SIZE,
    userId,
    branchId,
    codeId,
  });
  const selected = reviews.data?.items.find((item) => item.annotation.id === selectedId) ?? reviews.data?.items[0];
  const pageCount = Math.max(1, Math.ceil((reviews.data?.total ?? 0) / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
    setSelectedId(undefined);
  }, [annotationType, userId, branchId, codeId]);
  useEffect(() => {
    setReplacementCodeId(undefined);
  }, [selected?.annotation.id]);

  const handleResolve = (item: AnnotationReviewItem, action: AnnotationReviewAction, replacement?: number) => {
    resolveReview.mutate({
      projectId,
      annotationType: item.annotation_type,
      annotationId: item.annotation.id,
      branchId,
      requestBody: { action, replacement_code_id: replacement },
    });
  };

  const handleDelete = (item: AnnotationReviewItem) =>
    openConfirmationDialog({
      type: "DELETE",
      text: "Permanently delete this annotation? This action cannot be undone.",
      onAccept: () => handleResolve(item, AnnotationReviewAction.DELETE),
    });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <div>
          <Typography variant="h4">Annotation Review Queue</Typography>
          <Typography color="text.secondary">
            Review annotations using outdated snapshots from {reviewScope}.
          </Typography>
        </div>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <Tabs value={annotationType} onChange={(_event, value: AnnotationReviewType) => setAnnotationType(value)}>
            <Tab value={AnnotationReviewType.SPAN} label="Text spans" />
            <Tab value={AnnotationReviewType.SENTENCE} label="Sentences" />
            <Tab value={AnnotationReviewType.BBOX} label="Bounding boxes" />
          </Tabs>
          <Select
            size="small"
            value={branchId ?? "main"}
            onChange={(event) => onBranchChange(event.target.value === "main" ? null : Number(event.target.value))}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="main">Review Main</MenuItem>
            {branches.data?.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                Review {branch.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            displayEmpty
            value={userId ?? "all"}
            onChange={(event) => setUserId(event.target.value === "all" ? undefined : Number(event.target.value))}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="all">All annotators</MenuItem>
            {users.data?.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </MenuItem>
            ))}
          </Select>
        </Stack>
        {!reviews.isLoading && reviews.data?.total === 0 && (
          <Alert severity="success">There are no pending reviews for this selection.</Alert>
        )}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
          <Card sx={{ width: { md: 430 }, flexShrink: 0 }}>
            <CardContent>
              <List disablePadding>
                {reviews.data?.items.map((item) => {
                  const annotation = item.annotation;
                  const user = users.data?.find((candidate) => candidate.id === annotation.user_id);
                  return (
                    <ListItemButton
                      key={annotation.id}
                      selected={selected?.annotation.id === annotation.id}
                      onClick={() => setSelectedId(annotation.id)}
                    >
                      <ListItemText
                        primary={<SdocRenderer sdoc={annotation.sdoc_id} renderName renderDoctypeIcon />}
                        secondary={`${user ? `${user.first_name} ${user.last_name}` : "Unknown annotator"} · ${annotationSummary(item)}`}
                      />
                      <Chip size="small" color="warning" label="Review" />
                    </ListItemButton>
                  );
                })}
              </List>
              <Pagination sx={{ mt: 2 }} count={pageCount} page={page} onChange={(_event, value) => setPage(value)} />
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              {selected ? (
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{annotationSummary(selected)}</Typography>
                    <SdocRenderer sdoc={selected.annotation.sdoc_id} link renderName renderDoctypeIcon />
                  </Stack>
                  <Divider />
                  <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
                    <CodeDefinition title="Code assigned to annotation" code={selected.assigned_code} assigned />
                    <CodeDefinition title="Current code in assigned branch" code={selected.current_code} />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      variant="contained"
                      disabled={!selected.current_code}
                      onClick={() => handleResolve(selected, AnnotationReviewAction.UPDATE_CURRENT)}
                      loading={resolveReview.isPending}
                    >
                      Update to current code
                    </Button>
                    <Button color="error" onClick={() => handleDelete(selected)}>
                      Delete annotation
                    </Button>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Select
                      size="small"
                      displayEmpty
                      value={replacementCodeId ?? ""}
                      onChange={(event) => setReplacementCodeId(Number(event.target.value))}
                      sx={{ minWidth: 260 }}
                    >
                      <MenuItem value="" disabled>
                        Select another visible code
                      </MenuItem>
                      {visibleCodes.data?.map((code) => (
                        <MenuItem key={code.id} value={code.id}>
                          <CodeRenderer code={code} />
                        </MenuItem>
                      ))}
                    </Select>
                    <Button
                      variant="outlined"
                      disabled={!replacementCodeId}
                      onClick={() => handleResolve(selected, AnnotationReviewAction.REASSIGN, replacementCodeId)}
                    >
                      Reassign
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography color="text.secondary">Select an annotation to review it.</Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Stack>
    </Container>
  );
}

function annotationSummary(item: AnnotationReviewItem) {
  const annotation = item.annotation;
  if ("text" in annotation) return `“${annotation.text}”`;
  if ("sentence_id_start" in annotation)
    return `Sentences ${annotation.sentence_id_start}–${annotation.sentence_id_end}`;
  return `Bounding box ${annotation.id}`;
}

function CodeDefinition({
  title,
  code,
  assigned = false,
}: {
  title: string;
  code: CodeRead | null;
  assigned?: boolean;
}) {
  return (
    <Card variant="outlined" sx={{ flex: 1 }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2">{title}</Typography>
            {assigned && <Chip size="small" label="Assigned snapshot" />}
          </Stack>
          {code ? (
            <>
              <CodeRenderer code={code} />
              <Typography variant="body2">{code.description || "No description"}</Typography>
            </>
          ) : (
            <Typography color="text.secondary">This concept does not exist in the selected codebook.</Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
