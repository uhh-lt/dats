import { LLMHooks } from "@api/hooks/LLMHooks";
import { FuzzyGroundingStrategyParams } from "@models/FuzzyGroundingStrategyParams";
import { StrategyInfo } from "@models/StrategyInfo";
import { StrategyType } from "@models/StrategyType";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  DialogActions,
  DialogContent,
  FormControl,
  FormLabel,
  IconButton,
  Radio,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ChangeEvent, memo, useCallback, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LLMAssistantActions, LLMStrategyParams } from "../../../store/llmAssistantSlice";
import { LLMUtterance } from "./LLMUtterance";

const fuzzyDefaults: Required<Omit<FuzzyGroundingStrategyParams, "llm_strategy_type">> = {
  fuzzy_threshold: 0.85,
  context_before_chars: 64,
  context_after_chars: 64,
  chunk_size_tokens: 650,
  chunk_overlap_tokens: 100,
};

/** Split a description into summary (first line) and detail (rest). */
function splitDescription(description: string): { summary: string; detail: string } {
  const firstNewline = description.indexOf("\n");
  if (firstNewline === -1) return { summary: description, detail: "" };
  return {
    summary: description.slice(0, firstNewline),
    detail: description.slice(firstNewline + 1).trim(),
  };
}

/** Renders a single strategy as a selectable card with expandable details. */
const StrategyCard = memo(
  ({
    strategy,
    selected,
    onSelect,
  }: {
    strategy: StrategyInfo;
    selected: boolean;
    onSelect: (type: StrategyType) => void;
  }) => {
    const [expanded, setExpanded] = useState(false);
    const { summary, detail } = useMemo(() => splitDescription(strategy.description), [strategy.description]);

    const handleToggleExpand = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    const handleSelect = useCallback(() => {
      onSelect(strategy.llm_strategy_type);
    }, [onSelect, strategy.llm_strategy_type]);

    return (
      <Card
        variant="outlined"
        sx={{
          cursor: "pointer",
          borderColor: selected ? "primary.main" : undefined,
          borderWidth: selected ? 2 : 1,
          "&:hover": { borderColor: "primary.light" },
        }}
        onClick={handleSelect}
      >
        <CardContent sx={{ pb: detail ? 1 : undefined }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Radio checked={selected} size="small" />
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {strategy.name}
            </Typography>
            {detail && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand();
                }}
                sx={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 5.5 }}>
            {summary}
          </Typography>
          {detail && (
            <Collapse in={expanded}>
              <Box className="markdown-content" sx={{ ml: 5.5, mt: 1 }}>
                <Markdown remarkPlugins={[remarkGfm]}>{detail}</Markdown>
              </Box>
            </Collapse>
          )}
        </CardContent>
      </Card>
    );
  },
);

export const StrategySelectionStep = memo(() => {
  // global state
  const llmMethod = useAppSelector((state) => state.llmAssistant.llmMethod);
  const dispatch = useAppDispatch();

  // fetch available strategies for the selected task
  const strategies = LLMHooks.useListStrategies(llmMethod);

  // local state
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType | undefined>(undefined);
  const [fuzzyParams, setFuzzyParams] = useState(fuzzyDefaults);
  const fuzzyParamsAreValid =
    fuzzyParams.fuzzy_threshold >= 0 &&
    fuzzyParams.fuzzy_threshold <= 1 &&
    Number.isInteger(fuzzyParams.context_before_chars) &&
    fuzzyParams.context_before_chars >= 0 &&
    Number.isInteger(fuzzyParams.context_after_chars) &&
    fuzzyParams.context_after_chars >= 0 &&
    Number.isInteger(fuzzyParams.chunk_size_tokens) &&
    fuzzyParams.chunk_size_tokens > 0 &&
    Number.isInteger(fuzzyParams.chunk_overlap_tokens) &&
    fuzzyParams.chunk_overlap_tokens >= 0 &&
    fuzzyParams.chunk_overlap_tokens < fuzzyParams.chunk_size_tokens;

  // the currently selected strategy info
  const selectedStrategyInfo: StrategyInfo | undefined = useMemo(
    () => strategies.data?.find((s) => s.llm_strategy_type === selectedStrategy),
    [strategies.data, selectedStrategy],
  );

  // build the strategy params for the currently selected strategy
  const buildStrategyParams = useCallback(
    (strategyType: StrategyType): LLMStrategyParams => {
      if (strategyType === StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING) {
        return {
          llm_strategy_type: strategyType,
          ...fuzzyParams,
        };
      }
      return { llm_strategy_type: strategyType };
    },
    [fuzzyParams],
  );

  // memoized handlers
  const handleChangeFuzzyParam = useCallback(
    (field: keyof typeof fuzzyDefaults) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = parseFloat(event.target.value);
      setFuzzyParams((prev) => ({
        ...prev,
        [field]: isNaN(value) ? prev[field] : value,
      }));
    },
    [],
  );

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousLLMDialogStep());
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (!selectedStrategy) return;
    dispatch(
      LLMAssistantActions.llmDialogGoToApproachSelection({
        strategy: selectedStrategy,
        strategyParams: buildStrategyParams(selectedStrategy),
      }),
    );
  }, [selectedStrategy, buildStrategyParams, dispatch]);

  // auto-advance when there is exactly one strategy (nothing to choose)
  useEffect(() => {
    if (strategies.isSuccess && strategies.data.length === 1) {
      const only = strategies.data[0];
      dispatch(
        LLMAssistantActions.llmDialogGoToApproachSelection({
          strategy: only.llm_strategy_type,
          strategyParams: buildStrategyParams(only.llm_strategy_type),
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategies.isSuccess, strategies.data, dispatch]);

  // initialize selection to the first strategy once loaded
  useEffect(() => {
    if (strategies.isSuccess && strategies.data.length > 0 && selectedStrategy === undefined) {
      setSelectedStrategy(strategies.data[0].llm_strategy_type);
    }
  }, [strategies.isSuccess, strategies.data, selectedStrategy]);

  if (strategies.isLoading) {
    return (
      <DialogContent sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </DialogContent>
    );
  }

  if (strategies.isError) {
    return (
      <DialogContent>
        <LLMUtterance>
          <Typography>I could not load the available strategies. Please go back and try again.</Typography>
        </LLMUtterance>
        <DialogActions>
          <Box flexGrow={1} />
          <Button onClick={handleBack}>Back</Button>
        </DialogActions>
      </DialogContent>
    );
  }

  // single strategy: we auto-advanced, render nothing
  if (strategies.data && strategies.data.length <= 1) {
    return null;
  }

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>How should I work? Please select a strategy.</Typography>
        </LLMUtterance>
        <FormControl sx={{ ml: 12.5, my: 2, mr: 2, maxWidth: 1000 }}>
          <FormLabel id="strategy-selection-label">Strategy</FormLabel>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {strategies.data?.map((strategy) => (
              <StrategyCard
                key={strategy.llm_strategy_type}
                strategy={strategy}
                selected={selectedStrategy === strategy.llm_strategy_type}
                onSelect={setSelectedStrategy}
              />
            ))}
          </Stack>
        </FormControl>

        {selectedStrategyInfo?.llm_strategy_type === StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING && (
          <Stack spacing={2} sx={{ ml: 12.5, my: 2, maxWidth: 400 }}>
            <Typography variant="subtitle2">Strategy settings</Typography>
            <TextField
              label="Fuzzy threshold"
              type="number"
              size="small"
              value={fuzzyParams.fuzzy_threshold}
              onChange={handleChangeFuzzyParam("fuzzy_threshold")}
              inputProps={{ step: 0.05, min: 0, max: 1 }}
              error={fuzzyParams.fuzzy_threshold < 0 || fuzzyParams.fuzzy_threshold > 1}
              helperText="Minimum similarity (0-1) for grounding extracted quotes"
            />
            <TextField
              label="Context before (chars)"
              type="number"
              size="small"
              value={fuzzyParams.context_before_chars}
              onChange={handleChangeFuzzyParam("context_before_chars")}
              inputProps={{ step: 8, min: 0 }}
              error={!Number.isInteger(fuzzyParams.context_before_chars) || fuzzyParams.context_before_chars < 0}
              helperText="Must be a non-negative whole number"
            />
            <TextField
              label="Context after (chars)"
              type="number"
              size="small"
              value={fuzzyParams.context_after_chars}
              onChange={handleChangeFuzzyParam("context_after_chars")}
              inputProps={{ step: 8, min: 0 }}
              error={!Number.isInteger(fuzzyParams.context_after_chars) || fuzzyParams.context_after_chars < 0}
              helperText="Must be a non-negative whole number"
            />
            <TextField
              label="Chunk size (tokens)"
              type="number"
              size="small"
              value={fuzzyParams.chunk_size_tokens}
              onChange={handleChangeFuzzyParam("chunk_size_tokens")}
              inputProps={{ step: 50, min: 1 }}
              error={!Number.isInteger(fuzzyParams.chunk_size_tokens) || fuzzyParams.chunk_size_tokens <= 0}
              helperText="Must be a positive whole number"
            />
            <TextField
              label="Chunk overlap (tokens)"
              type="number"
              size="small"
              value={fuzzyParams.chunk_overlap_tokens}
              onChange={handleChangeFuzzyParam("chunk_overlap_tokens")}
              inputProps={{ step: 10, min: 0 }}
              error={
                !Number.isInteger(fuzzyParams.chunk_overlap_tokens) ||
                fuzzyParams.chunk_overlap_tokens < 0 ||
                fuzzyParams.chunk_overlap_tokens >= fuzzyParams.chunk_size_tokens
              }
              helperText="Must be a non-negative whole number smaller than the chunk size"
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <Button
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loadingPosition="start"
          disabled={
            !selectedStrategy ||
            (selectedStrategy === StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING && !fuzzyParamsAreValid)
          }
          onClick={handleNext}
        >
          Next!
        </Button>
      </DialogActions>
    </>
  );
});
