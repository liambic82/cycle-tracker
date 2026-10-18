import { createContext, useContext, useEffect, useRef } from 'react';

// Explicit-save forms register with the modal so Back cancels only that form,
// and persisted-journal status is not mistaken for an unsaved draft's status.
export const JournalEditorContext = createContext<
  ((cancel: () => void, action: string) => () => void) | null
>(null);

export function useJournalDraft(cancel: () => void, action = 'Save') {
  const register = useContext(JournalEditorContext);
  const current = useRef(cancel);
  current.current = cancel;
  useEffect(() => register?.(() => current.current(), action), [register, action]);
}
