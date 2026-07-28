import { CodeBranchHooks } from "@api/hooks/CodeBranchHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import {
  createCodeConceptFilterValue,
  createCodeSnapshotFilterValue,
  parseCodeFilterValue,
} from "@core/filter/codeFilterValues";
import { useDebounce } from "@hooks/useDebounce";
import { CodeFilterConceptRead } from "@models/CodeFilterConceptRead";
import { CodeFilterVersionRead } from "@models/CodeFilterVersionRead";
import { CodeRead } from "@models/CodeRead";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  ListSubheader,
  ListItemButton,
  ListItemText,
  MenuItem,
  Pagination,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { dateToLocaleString } from "@utils/DateUtils";
import { memo, useEffect, useMemo, useState } from "react";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps";

const ALL_VERSIONS = "all-versions";
const BROWSE_HISTORY = "browse-history";
const HISTORY_PAGE_SIZE = 10;

export const CodeIdValueSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  const parsedValue = useMemo(() => parseCodeFilterValue(filterExpression.value), [filterExpression.value]);
  const [branchId, setBranchId] = useState<number | null>(parsedValue.branchId ?? null);
  const [conceptId, setConceptId] = useState<string | undefined>(parsedValue.conceptId);
  const [conceptQuery, setConceptQuery] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const branches = CodeBranchHooks.useListBranches(projectId);
  const concepts = CodeHooks.useFilterConcepts(projectId, branchId);
  const selectedSnapshot = CodeHooks.useGetCode(parsedValue.snapshotId);
  const versions = CodeHooks.useFilterVersionSummary(projectId, conceptId, branchId);

  useEffect(() => {
    if (!parsedValue.conceptId) return;
    setConceptId(parsedValue.conceptId);
    setBranchId(parsedValue.branchId ?? null);
  }, [parsedValue.branchId, parsedValue.conceptId]);

  useEffect(() => {
    if (!selectedSnapshot.data) return;
    if (conceptId === selectedSnapshot.data.concept_id) return;
    setConceptId(selectedSnapshot.data.concept_id);
    setBranchId(selectedSnapshot.data.branch_id);
  }, [conceptId, selectedSnapshot.data]);

  const selectedConcept = useMemo(() => {
    if (!conceptId) return null;
    const result = concepts.data?.find((concept) => concept.concept_id === conceptId);
    if (result) return result;
    if (!selectedSnapshot.data) return null;
    return conceptFromCode(selectedSnapshot.data, branchId);
  }, [branchId, conceptId, concepts.data, selectedSnapshot.data]);

  const filteredConcepts = useMemo(() => {
    const normalizedQuery = conceptQuery.trim().toLocaleLowerCase();
    return (concepts.data ?? []).filter((concept) => {
      if (!includeDeleted && concept.current.is_deleted) return false;
      if (!normalizedQuery) return true;
      return [
        concept.current.name,
        concept.current.description ?? "",
        ...concept.path,
        ...concept.historical_names,
        ...concept.historical_descriptions,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
  }, [conceptQuery, concepts.data, includeDeleted]);

  useEffect(() => {
    if (!selectedConcept) return;
    setConceptQuery(selectedConcept.current.name);
  }, [conceptId, selectedConcept?.current.name]);

  const versionOptions = useMemo(() => {
    if (!versions.data) return [];
    const options: VersionOption[] = [{ section: "Current", version: versions.data.current }];
    options.push(...versions.data.released.map((version) => ({ section: "Released", version }) as const));
    options.push(...versions.data.recent.map((version) => ({ section: "Recent", version }) as const));
    if (selectedSnapshot.data && !options.some(({ version }) => version.code.id === selectedSnapshot.data?.id)) {
      options.push({
        section: "Selected historical version",
        version: {
          code: selectedSnapshot.data,
          is_current: false,
          releases: [],
          filter_value: createCodeSnapshotFilterValue(selectedSnapshot.data.id),
        },
      });
    }
    return options;
  }, [selectedSnapshot.data, versions.data]);

  const selectedVersionValue = parsedValue.snapshotId
    ? createCodeSnapshotFilterValue(parsedValue.snapshotId)
    : conceptId
      ? ALL_VERSIONS
      : "";

  const handleBranchChange = (event: SelectChangeEvent<number | "main">) => {
    const nextBranchId = event.target.value === "main" ? null : Number(event.target.value);
    setBranchId(nextBranchId);
    setConceptId(undefined);
    setConceptQuery("");
    onChangeValue(filterExpression.id, "");
  };

  const handleConceptChange = (_event: React.SyntheticEvent, concept: CodeFilterConceptRead | null) => {
    setConceptId(concept?.concept_id);
    if (!concept) {
      onChangeValue(filterExpression.id, "");
      return;
    }
    onChangeValue(filterExpression.id, concept.filter_value);
  };

  const handleVersionChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    if (value === BROWSE_HISTORY) {
      setHistoryOpen(true);
      return;
    }
    if (value === ALL_VERSIONS && conceptId) {
      onChangeValue(
        filterExpression.id,
        selectedConcept?.filter_value ?? createCodeConceptFilterValue(conceptId, branchId),
      );
      return;
    }
    onChangeValue(filterExpression.id, value);
  };

  const handleHistorySelect = (version: CodeFilterVersionRead) => {
    onChangeValue(filterExpression.id, version.filter_value);
    setHistoryOpen(false);
  };

  return (
    <Stack sx={{ flex: "3 1 620px", minWidth: 0 }} spacing={0.5}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1} alignItems={{ lg: "flex-start" }}>
        <FormControl variant="filled" sx={{ minWidth: 150, flex: "0 1 180px" }}>
          <InputLabel id={`${filterExpression.id}-branch-label`}>Codebook</InputLabel>
          <Select
            labelId={`${filterExpression.id}-branch-label`}
            value={branchId ?? "main"}
            onChange={handleBranchChange}
          >
            <MenuItem value="main">Main</MenuItem>
            {branches.data?.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: "1 1 280px", minWidth: 220 }}>
          <Autocomplete
            value={selectedConcept}
            options={filteredConcepts}
            loading={concepts.isLoading}
            inputValue={conceptQuery}
            onInputChange={(_event, value) => setConceptQuery(value)}
            onChange={handleConceptChange}
            filterOptions={(options) => options}
            isOptionEqualToValue={(option, value) => option.concept_id === value.concept_id}
            getOptionLabel={(option) => option.current.name}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="filled"
                label="Concept"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {concepts.isFetching && <CircularProgress color="inherit" size={18} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.concept_id}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 11, height: 11, borderRadius: 0.5, bgcolor: option.current.color }} />
                    <Typography variant="body2">{option.current.name}</Typography>
                    {option.current.is_deleted && <Chip size="small" color="error" label="Deleted" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {option.path.join(" / ")}
                  </Typography>
                  {option.historical_names.length > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      Formerly {option.historical_names.map((name) => `“${name}”`).join(", ")}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            noOptionsText={conceptQuery.trim() ? "No matching concepts" : "No concepts in this codebook"}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={includeDeleted}
                onChange={(event) => setIncludeDeleted(event.target.checked)}
              />
            }
            label={<Typography variant="caption">Include deleted concepts</Typography>}
            sx={{ ml: 0, mt: 0.25 }}
          />
        </Box>

        <FormControl variant="filled" sx={{ minWidth: 260, flex: "1 1 320px" }} disabled={!conceptId}>
          <InputLabel id={`${filterExpression.id}-version-label`}>Version</InputLabel>
          <Select
            labelId={`${filterExpression.id}-version-label`}
            value={selectedVersionValue}
            onChange={handleVersionChange}
            renderValue={(value) => versionValueLabel(value, versionOptions)}
          >
            {parsedValue.snapshotId &&
              !versionOptions.some(({ version }) => version.code.id === parsedValue.snapshotId) && (
                <MenuItem value={createCodeSnapshotFilterValue(parsedValue.snapshotId)} sx={{ display: "none" }}>
                  Snapshot #{parsedValue.snapshotId}
                </MenuItem>
              )}
            <MenuItem value={ALL_VERSIONS}>
              <ListItemText primary="All versions" secondary="Recommended for normal concept searches" />
            </MenuItem>
            <Divider />
            {versionOptions.flatMap(({ section, version }, index) => [
              ...(index === 0 || versionOptions[index - 1]?.section !== section
                ? [<ListSubheader key={`${section}-header`}>{section}</ListSubheader>]
                : []),
              <MenuItem key={version.filter_value} value={version.filter_value}>
                <VersionLabel version={version} />
              </MenuItem>,
            ])}
            <Divider />
            <MenuItem value={BROWSE_HISTORY}>Browse complete history…</MenuItem>
          </Select>
          <FormHelperText>
            {versions.isError
              ? "Versions could not be loaded."
              : parsedValue.snapshotId
                ? `Matches only code snapshot #${parsedValue.snapshotId}.`
                : conceptId
                  ? `Matches annotations using any Main${branchId ? " or selected-branch" : ""} version of this concept.`
                  : "Select a concept first."}
          </FormHelperText>
        </FormControl>
      </Stack>

      <CodeVersionHistoryDialog
        open={historyOpen}
        projectId={projectId}
        conceptId={conceptId}
        branchId={branchId}
        branches={branches.data ?? []}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleHistorySelect}
      />
    </Stack>
  );
});

interface VersionOption {
  section: string;
  version: CodeFilterVersionRead;
}

function VersionLabel({ version }: { version: CodeFilterVersionRead }) {
  return (
    <Box>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2">{version.code.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          #{version.code.id}
        </Typography>
        {version.is_current && <Chip size="small" color="primary" label="Current" />}
        {version.releases.map((release) => (
          <Chip key={release.id} size="small" variant="outlined" label={`v${release.version}`} />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {dateToLocaleString(version.code.created)}
      </Typography>
    </Box>
  );
}

function CodeVersionHistoryDialog({
  open,
  projectId,
  conceptId,
  branchId,
  branches,
  onClose,
  onSelect,
}: {
  open: boolean;
  projectId: number | undefined;
  conceptId: string | undefined;
  branchId: number | null;
  branches: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSelect: (version: CodeFilterVersionRead) => void;
}) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);
  const versions = CodeHooks.useFilterVersions({
    projectId,
    conceptId,
    branchId,
    query: debouncedQuery,
    page,
    pageSize: HISTORY_PAGE_SIZE,
    enabled: open,
  });
  const pageCount = Math.max(1, Math.ceil((versions.data?.total ?? 0) / HISTORY_PAGE_SIZE));

  useEffect(() => setPage(1), [debouncedQuery, conceptId, branchId]);

  const handleClose = () => {
    setQuery("");
    setPage(1);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Browse complete code history</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            autoFocus
            size="small"
            label="Search names, descriptions, or change messages"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {versions.isLoading && <CircularProgress size={28} sx={{ alignSelf: "center" }} />}
          {versions.isError && <Typography color="error">Code history could not be loaded.</Typography>}
          <Stack divider={<Divider flexItem />}>
            {versions.data?.items.map((version) => (
              <ListItemButton key={version.code.id} onClick={() => onSelect(version)} alignItems="flex-start">
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: version.code.color, mt: 1, mr: 1.5 }} />
                <ListItemText
                  primary={<VersionLabel version={version} />}
                  secondary={
                    <>
                      {version.code.commit_message && <span>{version.code.commit_message} · </span>}
                      {version.code.branch_id === null
                        ? "Main"
                        : (branches.find((branch) => branch.id === version.code.branch_id)?.name ??
                          `Branch ${version.code.branch_id}`)}
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </Stack>
          {!versions.isLoading && versions.data?.items.length === 0 && (
            <Typography color="text.secondary">No matching versions.</Typography>
          )}
          {(versions.data?.total ?? 0) > HISTORY_PAGE_SIZE && (
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_event, value) => setPage(value)}
              sx={{ alignSelf: "center" }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function conceptFromCode(code: CodeRead, branchId: number | null): CodeFilterConceptRead {
  return {
    concept_id: code.concept_id,
    current: code,
    path: [code.name],
    historical_names: [],
    historical_descriptions: [],
    filter_value: createCodeConceptFilterValue(code.concept_id, branchId),
  };
}

function versionValueLabel(value: string, options: VersionOption[]) {
  if (value === ALL_VERSIONS) return "All versions";
  const selected = options.find((option) => option.version.filter_value === value)?.version;
  return selected ? `${selected.code.name} · snapshot #${selected.code.id}` : "Select a version";
}
