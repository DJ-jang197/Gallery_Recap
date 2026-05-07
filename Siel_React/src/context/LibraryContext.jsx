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

  return (
    <LibraryContext.Provider 
      value={{ 
        entries, 
        loading, 
        addEntryToLibrary, 
        removeEntryFromLibrary,
        refreshEntries
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};
