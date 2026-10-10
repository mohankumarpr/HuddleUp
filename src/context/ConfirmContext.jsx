import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

const ConfirmContext = createContext(null);

// A promise-based replacement for window.confirm() -- the browser's native dialog looks jarring
// against the rest of the app's design and can't be styled at all. `confirm(...)` resolves to
// true/false exactly like `window.confirm` did, so call sites barely change (just add `await`).
export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((opts) => {
    const normalized = typeof opts === "string" ? { description: opts } : opts || {};
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setOptions(normalized);
    });
  }, []);

  function settle(result) {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(options)} onClose={() => settle(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{options?.title || "Are you sure?"}</DialogTitle>
        <DialogContent>
          <DialogContentText>{options?.description}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => settle(false)}>{options?.cancelLabel || "Cancel"}</Button>
          <Button
            onClick={() => settle(true)}
            variant="contained"
            color={options?.destructive ? "error" : "primary"}
            autoFocus
          >
            {options?.confirmLabel || "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
