// src/NoteApplication.tsx
import React, { useState, useEffect } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import {
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  Typography,
  Button,
  ListItemButton,
  TableContainer,
  TableBody,
  TableRow,
  TableCell,
  Table,
  Paper,
  Toolbar,
  AppBar,
  IconButton,
  useMediaQuery,
  InputAdornment, // Added InputAdornment
} from "@mui/material";
import { Note } from "@/app/types";
import { addNote, getAllNotes, searchNotes, getDB } from "@/app/db";
import { generateSummary, transcribeAudio } from "@/app/api";
import Recorder from "@/app/components/Recorder";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Spinner from "@/app/Spinner";
import { DynamicWidget } from "@/lib/dynamic";

interface Props {
  isLoading: boolean;
}

const NoteApplication: React.FC<Props> = ({ isLoading }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [displayedNotes, setDisplayedNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [telegramHandleInput, setTelegramHandleInput] = useState<string>("");

  // Use MUI's useMediaQuery to detect mobile devices
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Function to toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when a note is selected (on mobile)
  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
    setTelegramHandleInput(note.telegramHandle || "");
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const allNotes = await getAllNotes();
    // Sort notes by date (descending)
    allNotes.sort((a, b) => b.date.getTime() - a.date.getTime());
    setNotes(allNotes);
    setDisplayedNotes(allNotes);
  };

  const handleRecordingComplete = async (audioBlob: Blob, type: string) => {
    try {
      // Transcribe audio
      const transcription = await transcribeAudio(audioBlob, type);

      // Generate summary
      const { title, category, summary, metadata } =
        await generateSummary(transcription);

      // Create note object
      const note: Note = {
        title,
        category,
        summary,
        transcription,
        metadata,
        date: new Date(),
      };

      // Save note
      await addNote(note);
      await loadNotes();
    } catch (error) {
      console.error("Error processing recording:", error);
    }
  };

  const renderMetadataValue = (value: any) => {
    if (Array.isArray(value)) {
      // If it's an array, join the values
      return value.join(", ");
    } else if (typeof value === "object" && value !== null) {
      // If it's an object, render its key-value pairs
      return (
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          {Object.entries(value).map(([subKey, subValue]) => (
            <li key={subKey}>
              <Typography variant="body2">
                <strong>{subKey}:</strong> {String(subValue)}
              </Typography>
            </li>
          ))}
        </ul>
      );
    } else {
      // For strings or other types, render directly
      return String(value);
    }
  };

  const handleSearchChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const query = event.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      setDisplayedNotes(notes);
    } else {
      const filteredNotes = await searchNotes(query);
      // Sort filtered notes by date (descending)
      filteredNotes.sort((a, b) => b.date.getTime() - a.date.getTime());
      setDisplayedNotes(filteredNotes);
    }
  };

  const handleSaveTelegramHandle = async () => {
    if (selectedNote) {
      const updatedNote = {
        ...selectedNote,
        telegramHandle: telegramHandleInput,
      };

      // Update the note in IndexedDB
      const db = await getDB();
      await db.put("notes", updatedNote);

      // Update the state
      setSelectedNote(updatedNote);

      // Also update the notes and displayedNotes state
      const updatedNotes = notes.map((note) =>
        note.id === updatedNote.id ? updatedNote : note,
      );
      setNotes(updatedNotes);
      setDisplayedNotes(updatedNotes);
    }
  };

  return (
    <div className="container">
      {/* Topbar */}
      <div className="topbar">
        {/* AppBar with Menu Button on Mobile */}
        {isMobile && (
          <AppBar position="static">
            {!isSidebarOpen && (
              <Toolbar>
                <IconButton
                  edge="start"
                  color="default"
                  aria-label="menu"
                  onClick={toggleSidebar}
                >
                  <ArrowBackIcon />
                </IconButton>
              </Toolbar>
            )}
          </AppBar>
        )}
        <div
          className="flex items-center space-x-2 py-4 px-4"
          style={{ flexFlow: "column" }}
        >
          {isLoading ? <Spinner /> : <DynamicWidget />}
          <Recorder
            onRecordingComplete={handleRecordingComplete}
            isLoading={isLoading}
          />
        </div>
        <Divider />
      </div>
      {/* Main Content */}
      <div className="main">
        {/* Sidebar */}
        {(!isMobile || isSidebarOpen) && (
          <div className="sidebar">
            <div style={{ padding: "10px" }}>
              <TextField
                placeholder="Search notes..."
                value={searchQuery}
                onChange={handleSearchChange}
                fullWidth
                variant="outlined"
                size="small"
                style={{ margin: "10px 0" }}
              />
            </div>
            <Divider />
            <List component="nav">
              {displayedNotes.map((note) => (
                <div key={note.id}>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleNoteSelect(note)}>
                      <ListItemText
                        primary={
                          note.telegramHandle
                            ? `@${note.telegramHandle}`
                            : note.title
                        }
                        secondary={`${note.category} - ${note.date.toLocaleString()}`}
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </div>
              ))}
            </List>
          </div>
        )}
        {/* Content */}
        <div
          className="content"
          style={{ marginLeft: isMobile && isSidebarOpen ? 0 : undefined }}
        >
          {selectedNote ? (
            <>
              {selectedNote.telegramHandle ? (
                <Typography variant="h4">
                  <a
                    href={`https://t.me/${selectedNote.telegramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{selectedNote.telegramHandle}
                  </a>
                </Typography>
              ) : (
                <Typography variant="h4">{selectedNote.title}</Typography>
              )}
              <Typography variant="subtitle1" color="textSecondary">
                {selectedNote.category} - {selectedNote.date.toLocaleString()}
              </Typography>

              {/* Telegram Handle Input */}
              <Typography
                variant="subtitle1"
                color="textSecondary"
                style={{ marginTop: "20px" }}
              >
                Telegram handle:
              </Typography>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: "8px",
                }}
              >
                <TextField
                  value={telegramHandleInput}
                  onChange={(e) => setTelegramHandleInput(e.target.value)}
                  variant="outlined"
                  size="small"
                  style={{ marginRight: "8px" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">@</InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveTelegramHandle}
                >
                  Save
                </Button>
              </div>

              <Typography variant="body1" style={{ marginTop: "20px" }}>
                {selectedNote.summary}
              </Typography>
              {/* Display Metadata */}
              {selectedNote.metadata &&
                Object.keys(selectedNote.metadata).length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <Typography variant="h5" style={{ marginBottom: "10px" }}>
                      Metadata
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table aria-label="metadata table">
                        <TableBody>
                          {Object.entries(selectedNote.metadata).map(
                            ([key, value], index) => (
                              <TableRow
                                key={key}
                                style={{
                                  backgroundColor:
                                    index % 2 === 0 ? "#f9f9f9" : "#ffffff",
                                }}
                              >
                                <TableCell
                                  component="th"
                                  scope="row"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {key.charAt(0).toUpperCase() + key.slice(1)}
                                </TableCell>
                                <TableCell>
                                  {renderMetadataValue(value)}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                )}
            </>
          ) : (
            <Typography variant="h6">
              Select a note to view its details.
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteApplication;
