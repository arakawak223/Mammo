import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook to respond to app state changes (active, background, inactive).
 * Useful for refreshing data when app comes to foreground.
 */
export function useAppState(onChange: (state: AppStateStatus) => void): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current !== nextState) {
        appState.current = nextState;
        onChange(nextState);
      }
    });

    return () => subscription.remove();
  }, [onChange]);
}
