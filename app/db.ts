// src/db.ts
import { Note } from "./types";
import { IDBPDatabase } from "idb";

let dbPromise: Promise<IDBPDatabase<{ notes: Note }>> | null = null;

export const getDB = async () => {
  if (typeof window === "undefined") {
    throw new Error("getDB can only be called on the client side");
  }

  if (!dbPromise) {
    const { openDB } = await import("idb");
    dbPromise = openDB<{ notes: Note }>("VoiceNotesDB", 1, {
      upgrade(db) {
        const store = db.createObjectStore("notes", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("date", "date");
        store.createIndex("category", "category");
      },
    });
  }

  return dbPromise;
};

export const addNote = async (note: Note): Promise<void> => {
  const db = await getDB();
  await db.add("notes", note);
};

export const getAllNotes = async (): Promise<Note[]> => {
  const db = await getDB();
  return await db.getAllFromIndex("notes", "date");
};

export const searchNotes = async (query: string): Promise<Note[]> => {
  const db = await getDB();
  const allNotes = await db.getAll("notes");
  const lowerCaseQuery = query.toLowerCase();

  const searchInMetadata = (metadata: any): boolean => {
    if (metadata == null) return false;

    if (typeof metadata === "string") {
      return metadata.toLowerCase().includes(lowerCaseQuery);
    } else if (typeof metadata === "number" || typeof metadata === "boolean") {
      return metadata.toString().toLowerCase().includes(lowerCaseQuery);
    } else if (Array.isArray(metadata)) {
      return metadata.some((item) => searchInMetadata(item));
    } else if (typeof metadata === "object") {
      return Object.values(metadata).some((value) => searchInMetadata(value));
    }

    // For other data types (e.g., functions, symbols), return false
    return false;
  };

  return allNotes.filter(
    (note: Note) =>
      note.title.toLowerCase().includes(lowerCaseQuery) ||
      note.category.toLowerCase().includes(lowerCaseQuery) ||
      note.transcription.toLowerCase().includes(lowerCaseQuery) ||
      note.summary.toLowerCase().includes(lowerCaseQuery) ||
      note.telegramHandle?.toLowerCase().includes(lowerCaseQuery) ||
      searchInMetadata(note.metadata),
  );
};
