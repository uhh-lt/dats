import { LLMHooks } from "@api/hooks/LLMHooks";
import AddCommentIcon from "@mui/icons-material/AddComment";
import RedoIcon from "@mui/icons-material/Redo"; // Redo (using Redo for clarity, though user asked for Undo for restore)
import SendIcon from "@mui/icons-material/Send";
import UndoIcon from "@mui/icons-material/Undo"; // Revert
import {
  Box,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useState } from "react";
import Markdown from "react-markdown";
import { PerspectivesQueryOptions } from "../../../../_api/perspectivesQueryOptions";
import { PerspectivesActions } from "../../../../store/perspectivesSlice";

interface ChatMessage {
  id: string;
  message: string;
  speaker: "user" | "agent";
}

export function AnalysisAssistant() {
  const availableLLMs = LLMHooks.useGetAvailableLLMs();

  const theme = useTheme();
  const [inputText, setInputText] = useState<string>("");

  const selectedSdocIds = useAppSelector((state) => state.perspectives.selectedSdocIds);
  const projectId = useAppSelector((state) => state.project.projectId);
  const model = useAppSelector((state) => state.perspectives.chatModelId);
  const sessionId = useAppSelector((state) => state.perspectives.chatSessionId);
  const messages = useAppSelector((state) => state.perspectives.chatMessages);
  const lastDeleted = useAppSelector((state) => state.perspectives.lastDeletedChatMessages);
  const dispatch = useAppDispatch();
  const ragChat = PerspectivesQueryOptions.useRAGChat();
  const handleSendMessage = () => {
    if (inputText.trim() === "") return;
    if (!projectId) return;

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      message: inputText,
      speaker: "user",
    };
    dispatch(PerspectivesActions.onChatMessageSent(newUserMessage));
    setInputText("");

    ragChat.mutate(
      {
        model: model,
        sessionId: sessionId,
        projId: projectId,
        requestBody: {
          query: newUserMessage.message,
          sdoc_ids: selectedSdocIds,
        },
        threshold: 0.5,
        topK: selectedSdocIds.length, // Adjust as needed
      },
      {
        onSuccess: (response) => {
          dispatch(PerspectivesActions.onChatResponseReceived(response));
        },
        onError: (error) => {
          console.error("Error sending message:", error);
          // Handle error appropriately
        },
      },
    );
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartNewChat = () => {
    setInputText("");
    dispatch(PerspectivesActions.onChatReset());
  };

  const handleRevert = () => {
    dispatch(PerspectivesActions.onChatRevert());
  };

  const handleRedo = () => {
    dispatch(PerspectivesActions.onChatRedo());
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          p: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          display: "flex",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Box flexGrow={2}>
          <Typography variant="caption" color="textSecondary">
            Chat about {selectedSdocIds.length} selected docs
          </Typography>
        </Box>
        <Box flexGrow={1} />
        <Stack direction={"row"} spacing={1}>
          <Tooltip title="Revert Last Turn">
            <IconButton onClick={handleRevert} size="small" disabled={messages.length === 0}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo Last Reverted Turn">
            <IconButton onClick={handleRedo} size="small" disabled={lastDeleted.length === 0}>
              <RedoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Start New Chat">
            <IconButton onClick={handleStartNewChat} size="small">
              <AddCommentIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Select Model">
            <TextField
              select
              size="small"
              value={model}
              onChange={(e) => dispatch(PerspectivesActions.onChatModelChange(e.target.value))}
            >
              {availableLLMs.isError ? (
                <MenuItem value="default" disabled>
                  Error loading models (using default)
                </MenuItem>
              ) : availableLLMs.isLoading ? (
                <MenuItem value="default" disabled>
                  Loading models...
                </MenuItem>
              ) : availableLLMs.isSuccess ? (
                availableLLMs.data.map((model, idx) => (
                  <MenuItem key={model} value={idx === 0 ? "default" : model}>
                    {model} {idx === 0 ? "(default)" : ""}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="default">Default</MenuItem>
              )}
            </TextField>
          </Tooltip>
        </Stack>
      </Box>

      {/* Chat History */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              justifyContent: msg.speaker === "user" ? "flex-end" : "flex-start",
            }}
          >
            <Paper
              elevation={2}
              sx={{
                p: 1.5,
                maxWidth: "70%",
                backgroundColor:
                  msg.speaker === "user"
                    ? alpha(theme.palette.primary.main, 0.2)
                    : alpha(theme.palette.secondary.main, 0.2),
                color: theme.palette.text.primary,
                textAlign: msg.speaker === "user" ? "right" : "left",
                borderRadius: msg.speaker === "user" ? "10px 10px 0 10px" : "10px 10px 10px 0",
              }}
            >
              <Typography variant="body1">
                <Markdown>{msg.message}</Markdown>
              </Typography>
            </Paper>
          </Box>
        ))}
        {ragChat.isPending && (
          <Box sx={{ textAlign: "center", color: theme.palette.text.secondary, mt: 2 }}>
            <Typography variant="body2">Thinking...</Typography>
          </Box>
        )}
        {messages.length === 0 && (
          <Box sx={{ textAlign: "center", color: theme.palette.text.secondary, mt: 4 }}>
            <Typography variant="h6">Analysis Assistant</Typography>
            <Typography variant="body1">
              Start a conversation by typing your message below.
              <br />
              <br />
              <b>Warning: This is still under development!</b>
            </Typography>
          </Box>
        )}
      </Box>

      {/* Input Box */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Type your message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          multiline
          maxRows={4}
        />
        <Tooltip title="Send Message">
          <IconButton color="primary" onClick={handleSendMessage} disabled={!inputText.trim()}>
            <SendIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
