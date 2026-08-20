import { AttachedObjectTypeIcons, getIconComponent } from "@components/icons";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { MenuItem, Stack, TextField } from "@mui/material";
import { ChangeEvent, ComponentType, memo, useCallback, useMemo } from "react";
import { MyFilterExpression } from "../../../../../../filterUtils";
import { SharedFilterValueSelectorProps } from "../types/SharedFilterValueSelectorProps";
import { CodeIdValueSelector } from "./CodeIdValueSelector";
import { TagIdValueSelector } from "./TagIdValueSelector";

/**
 * Value selector for FilterValueType.ATTACHED_OBJECT.
 *
 * The value is a `[type, id]` pair (e.g. `["tag", "5"]`). Filtering by the raw id
 * alone is meaningless because ids collide across entity types, so the attached
 * object type is always part of the comparison.
 *
 * The first dropdown selects the AttachedObjectType. Depending on the selected
 * type, a second entity-specific selector is rendered that provides the id.
 * To support additional types, register a selector in `attachedObjectType2selector`.
 */

// Adapts an entity id selector (which reads/writes a single id) to the
// [type, id] pair shape required by the ATTACHED_OBJECT filter value.
const wrapIdSelector = (Selector: ComponentType<SharedFilterValueSelectorProps>, type: AttachedObjectType) => {
  const WrappedSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
    // derive a single-id expression for the wrapped selector from the [type, id] pair
    const idExpression: MyFilterExpression = useMemo(() => {
      const value = filterExpression.value;
      const rawId = Array.isArray(value) && value.length === 2 ? value[1] : "-1";
      const id = typeof rawId === "string" ? parseInt(rawId) || -1 : -1;
      return { ...filterExpression, value: id };
    }, [filterExpression]);

    const handleChangeId = useCallback(
      (_id: string, value: string | number | boolean | string[]) => {
        onChangeValue(filterExpression.id, [type, String(value)]);
      },
      [filterExpression.id, onChangeValue],
    );

    return <Selector filterExpression={idExpression} onChangeValue={handleChangeId} />;
  });
  return WrappedSelector;
};

// Registry mapping an AttachedObjectType to its entity id selector.
// Add new entries here to support more attached object types.
const attachedObjectType2selector: Partial<Record<AttachedObjectType, ComponentType<SharedFilterValueSelectorProps>>> =
  {
    [AttachedObjectType.CODE]: wrapIdSelector(CodeIdValueSelector, AttachedObjectType.CODE),
    [AttachedObjectType.TAG]: wrapIdSelector(TagIdValueSelector, AttachedObjectType.TAG),
  };

const isValidPair = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length === 2 && value.every((entry) => typeof entry === "string");

export const AttachedObjectValueSelector = memo(
  ({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => {
    const type = isValidPair(filterExpression.value)
      ? (filterExpression.value[0] as AttachedObjectType)
      : AttachedObjectType.CODE;

    const handleTypeChange = useCallback(
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // reset the id when the type changes, ids are meaningless across types
        onChangeValue(filterExpression.id, [event.target.value, "-1"]);
      },
      [filterExpression.id, onChangeValue],
    );

    const IdSelector = attachedObjectType2selector[type];

    return (
      <>
        <TextField
          select
          variant="standard"
          fullWidth
          label="Object type"
          value={type}
          onChange={handleTypeChange}
          slotProps={{
            inputLabel: { shrink: true },
          }}
        >
          {Object.values(AttachedObjectType).map((objectType) => (
            <MenuItem key={objectType} value={objectType}>
              <Stack direction="row" alignItems="center" spacing={1}>
                {getIconComponent(AttachedObjectTypeIcons[objectType])}
                <span>{objectType.replaceAll("_", " ")}</span>
              </Stack>
            </MenuItem>
          ))}
        </TextField>
        {IdSelector ? (
          <IdSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />
        ) : (
          <i>Not Implemented!</i>
        )}
      </>
    );
  },
);
