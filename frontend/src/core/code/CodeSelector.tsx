import { NamedObjWithParentWithLevel, useWithLevel } from "@components/tree-explorer";
import { CodeRead } from "@models/CodeRead";
import {
  Autocomplete,
  AutocompleteRenderOptionState,
  Box,
  Button,
  Checkbox,
  Chip,
  FilterOptionsState,
  Stack,
  SxProps,
  TextField,
  Theme,
} from "@mui/material";
import { HTMLAttributes, Key, memo, useCallback, useMemo } from "react";
import { CodeHooks } from "./api/codeHooks";
import { CodeRenderer } from "./renderer";

type CodeOption = NamedObjWithParentWithLevel<CodeRead>;

// the selected codes shown in the unfocused field, the others are summarized as "+N more"
const MAX_VISIBLE_CODES = 3;

interface CodeSelectorBaseProps {
  title: string;
  /** The selectable codes; all codes of the project by default. They keep their hierarchy order. */
  selectableCodeIds?: number[];
  /** Shown in the empty field, e.g. "Any code". */
  placeholder?: string;
  size?: "small" | "medium";
  fullWidth?: boolean;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

interface SingleCodeSelectorProps extends CodeSelectorBaseProps {
  multiple?: false;
  value: number | undefined;
  onChange: (codeId: number | undefined) => void;
}

interface MultipleCodeSelectorProps extends CodeSelectorBaseProps {
  multiple: true;
  value: number[];
  onChange: (codeIds: number[]) => void;
  /** Shows "Select all" and "Clear" buttons below the field. */
  showSelectAll?: boolean;
  /** Shows no chips in the field, e.g. because the selected codes are listed elsewhere; the menu still checks them. */
  hideChips?: boolean;
}

export type CodeSelectorProps = SingleCodeSelectorProps | MultipleCodeSelectorProps;

/**
 * Selects one or several codes from the hierarchical list of the project's codes.
 * Typing searches the code names; the parents of matching codes stay visible (dimmed)
 * to show where the matches are. Selecting a parent code does not select its children.
 */
export function CodeSelector(props: CodeSelectorProps) {
  if (props.multiple) {
    return <MultipleCodeSelector {...props} />;
  }
  return <SingleCodeSelector {...props} />;
}

/** The selectable codes in hierarchy order, with their level and a lookup by id. */
function useCodeOptions(selectableCodeIds: number[] | undefined) {
  const projectCodes = CodeHooks.useGetAllCodes();
  const codesWithLevel = useWithLevel(projectCodes.data || []);
  const options = useMemo(() => {
    if (selectableCodeIds === undefined) return codesWithLevel;
    const selectable = new Set(selectableCodeIds);
    return codesWithLevel.filter((option) => selectable.has(option.data.id));
  }, [codesWithLevel, selectableCodeIds]);
  const optionById = useMemo(() => new Map(options.map((option) => [option.data.id, option])), [options]);
  return { options, optionById, isLoading: !projectCodes.isSuccess };
}

/** Matching codes and their ancestors; ancestors that do not match are marked to render them dimmed. */
function filterCodeOptions(options: CodeOption[], { inputValue }: FilterOptionsState<CodeOption>): CodeOption[] {
  const query = inputValue.trim().toLowerCase();
  if (query === "") return options;

  const parentById = new Map(options.map((option) => [option.data.id, option.data.parent_id]));
  const visible = new Set<number>();
  for (const option of options) {
    if (!option.data.name.toLowerCase().includes(query)) continue;
    let codeId: number | null | undefined = option.data.id;
    while (codeId !== null && codeId !== undefined && !visible.has(codeId)) {
      visible.add(codeId);
      codeId = parentById.get(codeId);
    }
  }
  return options.filter((option) => visible.has(option.data.id));
}

function isMatch(option: CodeOption, inputValue: string): boolean {
  const query = inputValue.trim().toLowerCase();
  return query === "" || option.data.name.toLowerCase().includes(query);
}

function renderCodeOption(
  { key, ...props }: HTMLAttributes<HTMLLIElement> & { key: Key },
  option: CodeOption,
  { selected, inputValue }: AutocompleteRenderOptionState,
  withCheckbox: boolean,
) {
  return (
    <Box
      component="li"
      key={key}
      {...props}
      style={{ paddingLeft: option.level * 16 + (withCheckbox ? 4 : 16) }}
      sx={{ opacity: isMatch(option, inputValue) ? 1 : 0.5 }}
    >
      {withCheckbox && <Checkbox size="small" checked={selected} sx={{ p: 0.5, mr: 0.5 }} />}
      <CodeRenderer code={option.data} />
    </Box>
  );
}

const getOptionLabel = (option: CodeOption) => option.data.name;
const isOptionEqualToValue = (option: CodeOption, value: CodeOption) => option.data.id === value.data.id;

const SingleCodeSelector = memo(
  ({ title, selectableCodeIds, placeholder, value, onChange, disabled, ...props }: SingleCodeSelectorProps) => {
    const { options, optionById, isLoading } = useCodeOptions(selectableCodeIds);
    const selected = value === undefined ? null : (optionById.get(value) ?? null);

    const handleChange = useCallback(
      (_event: unknown, option: CodeOption | null) => onChange(option?.data.id),
      [onChange],
    );

    return (
      <Autocomplete<CodeOption, false>
        {...props}
        options={options}
        value={selected}
        onChange={handleChange}
        disabled={disabled || isLoading}
        filterOptions={filterCodeOptions}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        renderOption={(optionProps, option, state) => renderCodeOption(optionProps, option, state, false)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={title}
            placeholder={placeholder}
            slotProps={{ inputLabel: { shrink: placeholder !== undefined || undefined } }}
          />
        )}
      />
    );
  },
);

const MultipleCodeSelector = memo(
  ({
    title,
    selectableCodeIds,
    placeholder,
    value,
    onChange,
    showSelectAll,
    hideChips,
    disabled,
    fullWidth,
    ...props
  }: MultipleCodeSelectorProps) => {
    const { options, optionById, isLoading } = useCodeOptions(selectableCodeIds);
    const selected = useMemo(() => value.flatMap((codeId) => optionById.get(codeId) ?? []), [value, optionById]);

    const handleChange = useCallback(
      (_event: unknown, newOptions: CodeOption[]) => onChange(newOptions.map((option) => option.data.id)),
      [onChange],
    );
    const handleSelectAll = useCallback(() => onChange(options.map((option) => option.data.id)), [options, onChange]);
    const handleClear = useCallback(() => onChange([]), [onChange]);

    const autocomplete = (
      <Autocomplete<CodeOption, true>
        {...props}
        multiple
        disableCloseOnSelect
        fullWidth={fullWidth}
        options={options}
        value={selected}
        onChange={handleChange}
        disabled={disabled || isLoading}
        filterOptions={filterCodeOptions}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        limitTags={MAX_VISIBLE_CODES}
        getLimitTagsText={(more) => `+${more} more`}
        renderOption={(optionProps, option, state) => renderCodeOption(optionProps, option, state, true)}
        renderTags={(tags, getTagProps) =>
          hideChips
            ? null
            : tags.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    size="small"
                    variant="outlined"
                    label={<CodeRenderer code={option.data} />}
                    {...tagProps}
                  />
                );
              })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={title}
            placeholder={hideChips || selected.length === 0 ? placeholder : undefined}
          />
        )}
      />
    );

    if (!showSelectAll) return autocomplete;
    return (
      <Stack spacing={0.5} width={fullWidth ? "100%" : undefined}>
        {autocomplete}
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={handleSelectAll} disabled={disabled || isLoading}>
            Select all codes
          </Button>
          <Button size="small" onClick={handleClear} disabled={disabled || value.length === 0}>
            Clear
          </Button>
        </Stack>
      </Stack>
    );
  },
);
