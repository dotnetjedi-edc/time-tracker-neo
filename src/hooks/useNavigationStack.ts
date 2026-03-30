import { useEffect, useCallback } from "react";
import { useTimeTrackerStore } from "../store/useTimeTrackerStore";

/**
 * Navigation Stack Entry
 * Represents a state snapshot in the app's history
 */
export interface NavigationStackEntry {
  id: string;
  state: {
    activeModal: "task" | "sessions" | "tags" | null;
    editingTaskId: string | null;
    sessionTaskId: string | null;
    sessionsModalView: "manual" | "history";
  };
  timestamp: number;
}

/**
 * useNavigationStack Hook
 *
 * Manages browser back button and Escape key navigation through app states.
 *
 * Usage:
 * ```tsx
 * const { pushState, popState } = useNavigationStack();
 *
 * // When opening a modal:
 * pushState('task', { editingTaskId: taskId });
 *
 * // Back button automatically triggers popState
 * ```
 */
export function useNavigationStack() {
  // We'll use a simple in-memory stack since this is a SPA
  // History API integration allows back button support

  const handleBack = useCallback(() => {
    // Pop the stack
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // At root - show toast
      const event = new CustomEvent("navigationStack:atRoot");
      window.dispatchEvent(event);
    }
  }, []);

  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleBack();
      }
    },
    [handleBack],
  );

  useEffect(() => {
    // Listen for popstate event (browser back button)
    const handlePopstate = () => {
      // The state restoration will be handled by the App component
      // via the modalState that gets reset
    };

    window.addEventListener("popstate", handlePopstate);
    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      window.removeEventListener("popstate", handlePopstate);
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [handleEscapeKey]);

  const pushState = useCallback(
    (
      modal: "task" | "sessions" | "tags" | null,
      stateData?: Record<string, unknown>,
    ) => {
      // Push a new history entry
      window.history.pushState(
        { modal, stateData, timestamp: Date.now() },
        "",
        window.location.href,
      );
    },
    [],
  );

  return {
    handleBack,
    pushState,
  };
}
