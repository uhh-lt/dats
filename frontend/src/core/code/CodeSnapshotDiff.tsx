import { CodeChangedField } from "@models/CodeChangedField";
import { CodeRead } from "@models/CodeRead";
import { Box, Chip, Stack, Typography } from "@mui/material";

interface CodeSnapshotDiffProps {
  before: CodeRead | null;
  after: CodeRead | null;
  changedFields: CodeChangedField[];
  beforeLabel?: string;
  afterLabel?: string;
}

export function CodeSnapshotDiff({
  before,
  after,
  changedFields,
  beforeLabel = "Before",
  afterLabel = "After",
}: CodeSnapshotDiffProps) {
  const displayCode = after ?? before;
  if (displayCode === null) return null;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: displayCode.color, flexShrink: 0 }} />
        <Typography variant="subtitle2">{displayCode.name}</Typography>
        {before === null && <Chip size="small" color="success" label="Created" />}
        {after === null && <Chip size="small" color="error" label="Removed" />}
        {after?.is_deleted && <Chip size="small" color="error" label="Deleted" />}
      </Stack>

      {changedFields.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No code-definition fields changed. This entry records a governance or lineage update.
        </Typography>
      )}

      {changedFields.map((field) => (
        <Box key={field}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
            {field.replaceAll("_", " ")}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1 }}
          >
            <DiffValue label={beforeLabel} field={field} value={before?.[field]} />
            <DiffValue label={afterLabel} field={field} value={after?.[field]} />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

interface DiffValueProps {
  label: string;
  field: CodeChangedField;
  value: string | boolean | null | undefined;
}

function DiffValue({ label, field, value }: DiffValueProps) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
      <Typography component="span" variant="caption" color="text.secondary" sx={{ minWidth: 44 }}>
        {label}
      </Typography>
      {field === CodeChangedField.COLOR && typeof value === "string" && (
        <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: value, flexShrink: 0 }} />
      )}
      <Typography component="span" variant="body2" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
        {formatValue(field, value)}
      </Typography>
    </Stack>
  );
}

function formatValue(field: CodeChangedField, value: string | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (field === CodeChangedField.ENABLED || field === CodeChangedField.IS_DELETED) {
    return value ? "Yes" : "No";
  }
  return String(value);
}
