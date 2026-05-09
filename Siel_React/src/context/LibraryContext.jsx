import React, { createContext, useState, useEffect } from 'react';
import { getAllEntries, saveEntry, deleteEntry } from '../services/db';

export const LibraryContext = createContext();

export const LibraryProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load entries on initial mount
  useEffect(() => {
    refreshEntries();
  }, []);

  // Reloads all entries from IndexedDB to keep context state authoritative.
  const refreshEntries = async () => {
    setLoading(true);
    try {
      const data = await getAllEntries();
      setEntries(data);
    } catch (error) {
      console.error("Failed to load library entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Persists one entry then refreshes in-memory list.
  const addEntryToLibrary = async (entryData) => {
    try {
      await saveEntry(entryData);
      await refreshEntries(); // Reload state
      return true;
    } catch (error) {
      console.error("Failed to save entry:", error);
      return false;
    }
  };

  // Deletes one entry then refreshes in-memory list.
  const removeEntryFromLibrary = async (id) => {
    try {
      await deleteEntry(id);
      await refreshEntries(); // Reload state
      return true;
    } catch (error) {
      console.error("Failed to delete entry:", error);
      return false;
    }
  };

  // Toggles pin status for an entry.
  const togglePinEntry = async (id) => {
    try {
      const entry = entries.find(e => e.id === id);
      if (!entry) return false;
      
      const updatedEntry = { ...entry, isPinned: !entry.isPinned };
      await saveEntry(updatedEntry);
      await refreshEntries();
      return true;
    } catch (error) {
      console.error("Failed to toggle pin status:", error);
      return false;
    }
  };

  return (
    <LibraryContext.Provider 
      value={{ 
        entries, 
        loading, 
        addEntryToLibrary, 
        removeEntryFromLibrary,
        togglePinEntry,
        refreshEntries
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};
