import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";

const NavigationGuardContext = createContext(null);

// Lets a page (currently just the live bidding screen) register a check that must pass before the
// top navbar is allowed to navigate away -- e.g. the Navbar logo, which previously jumped straight
// to the marketing home page with no warning, even mid-auction. Only one guard is active at a time
// (whichever page is mounted), which matches how routing already works: only one route is ever on
// screen.
export function NavigationGuardProvider({ children }) {
  const guardRef = useRef(null);

  const requestNavigation = useCallback(async () => {
    if (!guardRef.current) return true;
    return guardRef.current();
  }, []);

  return (
    <NavigationGuardContext.Provider value={{ guardRef, requestNavigation }}>{children}</NavigationGuardContext.Provider>
  );
}

// `guardFn` returns (or resolves to) true to allow navigation, false to block it. Pass `null`/
// `undefined` to not guard at all. Re-registers whenever `deps` change, and always unregisters on
// unmount so a page that's no longer shown can never block a later page's navigation.
export function useNavigationGuard(guardFn, deps) {
  const ctx = useContext(NavigationGuardContext);
  useEffect(() => {
    if (!ctx || !guardFn) return undefined;
    ctx.guardRef.current = guardFn;
    return () => {
      if (ctx.guardRef.current === guardFn) ctx.guardRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useRequestNavigation() {
  const ctx = useContext(NavigationGuardContext);
  return ctx ? ctx.requestNavigation : async () => true;
}
