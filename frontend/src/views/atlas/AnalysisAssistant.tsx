import AddCommentIcon from "@mui/icons-material/AddComment";
import RedoIcon from "@mui/icons-material/Redo"; // Redo (using Redo for clarity, though user asked for Undo for restore)
import SendIcon from "@mui/icons-material/Send";
import UndoIcon from "@mui/icons-material/Undo"; // Revert
import {
  Box,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useState } from "react";

interface ChatMessage {
  id: string;
  message: string;
  speaker: "user" | "agent";
}

function AnalysisAssistant() {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [lastDeleted, setLastDeleted] = useState<ChatMessage[]>([]); // For revert/redo

  const handleSendMessage = () => {
    if (inputText.trim() === "") return;

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      message: inputText,
      speaker: "user",
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputText("");
    setLastDeleted([]); // Clear redo history on new message

    // Mock agent response
    setTimeout(() => {
      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        message: `This is a mock response to: "${newUserMessage.message}"`,
        speaker: "agent",
      };
      setMessages((prevMessages) => [...prevMessages, agentMessage]);
    }, 1000);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartNewChat = () => {
    setMessages([]);
    setInputText("");
    setLastDeleted([]);
  };

  const handleRevert = () => {
    if (messages.length === 0) return;

    let messagesToRevert: ChatMessage[] = [];
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.speaker === "agent" && messages.length > 1) {
      const userMessageBeforeAgent = messages[messages.length - 2];
      if (userMessageBeforeAgent.speaker === "user") {
        messagesToRevert = [userMessageBeforeAgent, lastMessage];
        setMessages((prev) => prev.slice(0, -2));
      } else {
        // Only agent message left or multiple agent messages
        messagesToRevert = [lastMessage];
        setMessages((prev) => prev.slice(0, -1));
      }
    } else if (lastMessage.speaker === "user") {
      messagesToRevert = [lastMessage];
      setMessages((prev) => prev.slice(0, -1));
    } else {
      // Only one agent message exists
      messagesToRevert = [lastMessage];
      setMessages((prev) => prev.slice(0, -1));
    }
    setLastDeleted(messagesToRevert);
  };

  const handleRedo = () => {
    if (lastDeleted.length > 0) {
      setMessages((prevMessages) => [...prevMessages, ...lastDeleted]);
      setLastDeleted([]);
    }
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
        }}
      >
        <Box flexGrow={2}>
          <Typography variant="caption" color="textSecondary">
            Chat about 5 selected docs
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mt: -0.5 }}>
            <Box sx={{ width: "100%", mr: 1 }}>
              <LinearProgress variant="determinate" value={(5 / 100) * 100} />
            </Box>
            <Box flexShrink={0}>
              <Typography variant="body2" color="text.secondary">{`5/100`}</Typography>
            </Box>
          </Box>
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
              <Typography variant="body1">{msg.message}</Typography>
            </Paper>
          </Box>
        ))}
        {messages.length === 0 && (
          <Box sx={{ textAlign: "center", color: theme.palette.text.secondary, mt: 4 }}>
            <Typography variant="h6">Analysis Assistant</Typography>
            <Typography variant="body1">Start a conversation by typing your message below.</Typography>
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

export default AnalysisAssistant;
