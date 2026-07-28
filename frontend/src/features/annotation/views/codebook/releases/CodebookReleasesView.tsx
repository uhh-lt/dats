import { CodebookReleaseHooks } from "@api/hooks/CodebookReleaseHooks";
import { CodeSnapshotDiff } from "@core/code/CodeSnapshotDiff";
import { useDebounce } from "@hooks/useDebounce";
import { CodebookReleaseChangeType } from "@models/CodebookReleaseChangeType";
import { CodebookReleaseComparisonRead } from "@models/CodebookReleaseComparisonRead";
import { CodebookReleaseRead } from "@models/CodebookReleaseRead";
import { CodeRead } from "@models/CodeRead";
import { Add, AccountTree, ChevronRight, CompareArrows, ExpandMore, NewReleases, Search } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { useEffect, useMemo, useState } from "react";

interface CodebookReleasesViewProps {
  projectId: number;
}

const PAGE_SIZE = 10;

export function CodebookReleasesView({ projectId }: CodebookReleasesViewProps) {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedReleaseId, setExpandedReleaseId] = useState<number | null>(null);
  const [viewReleaseId, setViewReleaseId] = useState<number | null>(null);
  const [compareReleaseId, setCompareReleaseId] = useState<number | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 350);
  const releases = CodebookReleaseHooks.useListReleases(projectId, page, PAGE_SIZE, debouncedSearchQuery);
  const comparisonTargets = CodebookReleaseHooks.useListReleases(projectId, 1, 100, "");
  const pageCount = Math.max(1, Math.ceil((releases.data?.total ?? 0) / PAGE_SIZE));

  useEffect(() => setPage(1), [debouncedSearchQuery]);

  const handleToggleChanges = (releaseId: number) => {
    setExpandedReleaseId((current) => (current === releaseId ? null : releaseId));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <div>
            <Typography variant="h4">Codebook Releases</Typography>
            <Typography color="text.secondary">
              Publish and inspect immutable versions of the non-system Main codebook.
            </Typography>
          </div>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <TextField
              size="small"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find a release"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: { sm: 260 } }}
            />
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Create a new release
            </Button>
          </Stack>
        </Stack>

        {releases.isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}
        {releases.isError && <Alert severity="error">Codebook releases could not be loaded.</Alert>}
        {!releases.isLoading && releases.data?.items.length === 0 && (
          <Card variant="outlined">
            <CardContent sx={{ py: 6, textAlign: "center" }}>
              <NewReleases color="disabled" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6">{debouncedSearchQuery ? "No matching releases" : "No releases yet"}</Typography>
              <Typography color="text.secondary">
                {debouncedSearchQuery
                  ? "Try another version or description."
                  : "Create a release to preserve the current Main codebook as an immutable version."}
              </Typography>
            </CardContent>
          </Card>
        )}

        <Stack spacing={2}>
          {releases.data?.items.map((release) => (
            <ReleaseCard
              key={release.id}
              release={release}
              expanded={expandedReleaseId === release.id}
              onToggleChanges={handleToggleChanges}
              onView={setViewReleaseId}
              onCompare={setCompareReleaseId}
            />
          ))}
        </Stack>

        {(releases.data?.total ?? 0) > PAGE_SIZE && (
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_event, value) => setPage(value)}
            sx={{ alignSelf: "center" }}
          />
        )}
      </Stack>

      <CreateReleaseDialog projectId={projectId} open={createOpen} onClose={() => setCreateOpen(false)} />
      <ReleasedCodebookDialog releaseId={viewReleaseId} onClose={() => setViewReleaseId(null)} />
      <CompareReleaseDialog
        releaseId={compareReleaseId}
        releases={comparisonTargets.data?.items ?? []}
        onClose={() => setCompareReleaseId(null)}
      />
    </Container>
  );
}

interface ReleaseCardProps {
  release: CodebookReleaseRead;
  expanded: boolean;
  onToggleChanges: (releaseId: number) => void;
  onView: (releaseId: number) => void;
  onCompare: (releaseId: number) => void;
}

function ReleaseCard({ release, expanded, onToggleChanges, onView, onCompare }: ReleaseCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip color="primary" label={`v${release.version}`} sx={{ fontWeight: 600 }} />
              <Typography variant="caption" color="text.secondary">
                Released {dateToLocaleString(release.created)}
              </Typography>
              <Chip size="small" variant="outlined" label={`${release.code_count} codes`} />
            </Stack>
            {release.description ? (
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{release.description}</Typography>
            ) : (
              <Typography color="text.secondary" fontStyle="italic">
                No release notes provided.
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
      <Divider />
      <CardActions sx={{ px: 2, flexWrap: "wrap" }}>
        <Button size="small" startIcon={<AccountTree />} onClick={() => onView(release.id)}>
          View codebook
        </Button>
        <Button
          size="small"
          startIcon={expanded ? <ExpandMore /> : <ChevronRight />}
          onClick={() => onToggleChanges(release.id)}
        >
          What&apos;s changed
        </Button>
        <Button size="small" startIcon={<CompareArrows />} onClick={() => onCompare(release.id)}>
          Compare
        </Button>
      </CardActions>
      {expanded && (
        <>
          <Divider />
          <Box sx={{ p: 2, bgcolor: "action.hover" }}>
            {release.previous_release_id === null ? (
              <Alert severity="info">
                This is the first release. It established a baseline of {release.code_count} codes.
              </Alert>
            ) : (
              <ReleaseComparison
                releaseId={release.previous_release_id}
                targetReleaseId={release.id}
                title="Changes since the previous release"
              />
            )}
          </Box>
        </>
      )}
    </Card>
  );
}

function CreateReleaseDialog({ projectId, open, onClose }: { projectId: number; open: boolean; onClose: () => void }) {
  const createRelease = CodebookReleaseHooks.useCreateRelease();
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");

  const handleClose = () => {
    if (createRelease.isPending) return;
    createRelease.reset();
    setVersion("");
    setDescription("");
    onClose();
  };

  const handleCreate = () => {
    if (!version.trim()) return;
    createRelease.mutate(
      {
        requestBody: {
          project_id: projectId,
          version: version.trim(),
          description: description.trim() || null,
        },
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Create a new codebook release</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">
            This permanently captures the current non-system Main codebook. Releases cannot be edited or deleted.
          </Alert>
          <TextField
            autoFocus
            required
            label="Version"
            placeholder="1.0.0"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            helperText="Use a semantic version such as 1.2.0 or 2.0.0-beta.1."
          />
          <TextField
            label="Release notes"
            multiline
            minRows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe why this codebook version is being published."
          />
          {createRelease.isError && <Alert severity="error">{createRelease.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createRelease.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleCreate} disabled={!version.trim()} loading={createRelease.isPending}>
          Create release
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReleasedCodebookDialog({ releaseId, onClose }: { releaseId: number | null; onClose: () => void }) {
  const release = CodebookReleaseHooks.useRelease(releaseId);
  const [filter, setFilter] = useState("");
  const rows = useMemo(() => flattenCodes(release.data?.codes ?? []), [release.data?.codes]);
  const normalizedFilter = filter.trim().toLocaleLowerCase();
  const visibleRows = normalizedFilter
    ? rows.filter(({ code }) => `${code.name} ${code.description ?? ""}`.toLocaleLowerCase().includes(normalizedFilter))
    : rows;

  const handleClose = () => {
    setFilter("");
    onClose();
  };

  return (
    <Dialog open={releaseId !== null} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>{release.data ? `Codebook v${release.data.release.version}` : "Released codebook"}</DialogTitle>
      <DialogContent dividers>
        {release.isLoading && <CircularProgress />}
        {release.isError && <Alert severity="error">The released codebook could not be loaded.</Alert>}
        {release.data && (
          <Stack spacing={2}>
            <Alert severity="info">
              Read-only historical state from {dateToLocaleString(release.data.release.created)}.
            </Alert>
            <TextField
              size="small"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter codes"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Stack divider={<Divider flexItem />}>
              {visibleRows.map(({ code, depth }) => (
                <Stack
                  key={code.id}
                  direction="row"
                  spacing={1.25}
                  sx={{ py: 1.25, pl: depth * 3 }}
                  alignItems="flex-start"
                >
                  <Box sx={{ bgcolor: code.color, width: 13, height: 13, borderRadius: 0.5, mt: 0.4, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2">{code.name}</Typography>
                    {code.description && (
                      <Typography variant="body2" color="text.secondary">
                        {code.description}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ))}
              {visibleRows.length === 0 && <Typography color="text.secondary">No matching codes.</Typography>}
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function CompareReleaseDialog({
  releaseId,
  releases,
  onClose,
}: {
  releaseId: number | null;
  releases: CodebookReleaseRead[];
  onClose: () => void;
}) {
  const [targetReleaseId, setTargetReleaseId] = useState<number | null>(null);
  const baseRelease = releases.find((release) => release.id === releaseId);

  useEffect(() => setTargetReleaseId(null), [releaseId]);

  return (
    <Dialog open={releaseId !== null} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Compare codebook release</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
            <Chip label={baseRelease ? `v${baseRelease.version}` : "Selected release"} />
            <CompareArrows color="action" />
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="release-comparison-target-label">Compare with</InputLabel>
              <Select
                labelId="release-comparison-target-label"
                label="Compare with"
                value={targetReleaseId ?? "latest"}
                onChange={(event) =>
                  setTargetReleaseId(event.target.value === "latest" ? null : Number(event.target.value))
                }
              >
                <MenuItem value="latest">Main (latest)</MenuItem>
                {releases
                  .filter((release) => release.id !== releaseId)
                  .map((release) => (
                    <MenuItem key={release.id} value={release.id}>
                      v{release.version}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Stack>
          <ReleaseComparison releaseId={releaseId} targetReleaseId={targetReleaseId} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ReleaseComparison({
  releaseId,
  targetReleaseId,
  title,
}: {
  releaseId: number | null;
  targetReleaseId: number | null;
  title?: string;
}) {
  const comparison = CodebookReleaseHooks.useComparison(releaseId, targetReleaseId);

  if (comparison.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (comparison.isError) return <Alert severity="error">The codebook comparison could not be loaded.</Alert>;
  if (!comparison.data) return null;

  return <ComparisonContent comparison={comparison.data} title={title} />;
}

function ComparisonContent({ comparison, title }: { comparison: CodebookReleaseComparisonRead; title?: string }) {
  const beforeLabel = `v${comparison.base_release.version}`;
  const afterLabel = comparison.target_release ? `v${comparison.target_release.version}` : "Main latest";
  return (
    <Stack spacing={2}>
      <div>
        {title && (
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {beforeLabel} → {afterLabel}
        </Typography>
      </div>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" color="success" label={`${comparison.added_count} added`} />
        <Chip size="small" color="warning" label={`${comparison.modified_count} modified`} />
        <Chip size="small" color="error" label={`${comparison.removed_count} removed`} />
        <Chip size="small" variant="outlined" label={`${comparison.unchanged_count} unchanged`} />
      </Stack>
      {comparison.changes.length === 0 ? (
        <Typography color="text.secondary">There are no code-definition changes between these states.</Typography>
      ) : (
        <Stack spacing={2} divider={<Divider flexItem />}>
          {comparison.changes.map((change) => (
            <Box key={change.concept_id}>
              <Chip size="small" label={change.change_type} color={changeColor(change.change_type)} sx={{ mb: 1 }} />
              <CodeSnapshotDiff
                before={change.before}
                after={change.after}
                changedFields={change.changed_fields}
                beforeLabel={beforeLabel}
                afterLabel={afterLabel}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

interface FlattenedCode {
  code: CodeRead;
  depth: number;
}

function flattenCodes(codes: CodeRead[]): FlattenedCode[] {
  const byConcept = new Map(codes.map((code) => [code.concept_id, code]));
  const children = new Map<string | null, CodeRead[]>();
  for (const code of codes) {
    const parent = code.parent_concept_id && byConcept.has(code.parent_concept_id) ? code.parent_concept_id : null;
    children.set(parent, [...(children.get(parent) ?? []), code]);
  }
  children.forEach((items) => items.sort((left, right) => left.name.localeCompare(right.name)));

  const result: FlattenedCode[] = [];
  const visited = new Set<string>();
  const append = (code: CodeRead, depth: number) => {
    if (visited.has(code.concept_id)) return;
    visited.add(code.concept_id);
    result.push({ code, depth });
    for (const child of children.get(code.concept_id) ?? []) append(child, depth + 1);
  };
  for (const root of children.get(null) ?? []) append(root, 0);
  for (const code of codes) append(code, 0);
  return result;
}

function changeColor(changeType: CodebookReleaseChangeType): "success" | "warning" | "error" {
  if (changeType === CodebookReleaseChangeType.ADDED) return "success";
  if (changeType === CodebookReleaseChangeType.MODIFIED) return "warning";
  return "error";
}
