import { ErrorMessage } from "@hookform/error-message";
import SettingsIcon from "@mui/icons-material/Settings";
import { Button, IconButton, Popover, Stack, Tooltip } from "@mui/material";
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { FormNumber } from "../../../components/FormInputs/FormNumber.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "./imageSearchSlice.ts";

type SearchOptionValues = {
  topK: number;
  threshold: number;
};

export function ImageSimilaritySearchOptionsMenu() {
  // local state
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  // global client state (redux)
  const topK = useAppSelector((state) => state.imageSearch.topK);
  const threshold = useAppSelector((state) => state.imageSearch.threshold);
  const dispatch = useAppDispatch();

  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<SearchOptionValues>({
    defaultValues: {
      topK,
      threshold,
    },
  });

  const handleOpen: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
    reset({ topK, threshold });
  };

  const handleChangeSearchOptions: SubmitHandler<SearchOptionValues> = (data) => {
    // update global state
    dispatch(ImageSearchActions.onChangeSearchOptions({ threshold: data.threshold, topK: data.topK }));
    // close popover
    setAnchorEl(null);
  };
  const handleError: SubmitErrorHandler<SearchOptionValues> = (data) => console.error(data);

  return (
    <>
      <Tooltip title="Search options">
        <IconButton onClick={handleOpen}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
            },
          },
        }}
      >
        <Stack component="form" onSubmit={handleSubmit(handleChangeSearchOptions, handleError)} gap={2}>
          <FormNumber
            name="topK"
            control={control}
            rules={{
              required: "Value is required",
            }}
            textFieldProps={{
              label: "Top K",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.topK),
              helperText: <ErrorMessage errors={errors} name="topK" />,
              inputProps: {
                min: 1,
                max: Infinity,
                step: 1,
              },
            }}
          />
          <FormNumber
            name="threshold"
            control={control}
            rules={{
              required: "Value is required",
            }}
            textFieldProps={{
              label: "Threshold",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.threshold),
              helperText: <ErrorMessage errors={errors} name="threshold" />,
              inputProps: {
                min: 0,
                max: 1,
                step: 0.1,
              },
            }}
          />
          <Button type="submit" variant="contained">
            Apply
          </Button>
        </Stack>
      </Popover>
    </>
  );
}
