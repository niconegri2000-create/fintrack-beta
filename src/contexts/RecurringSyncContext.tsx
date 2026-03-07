import { createContext, useContext } from "react";

/** Signals that recurring transaction materialization is complete */
export const RecurringSyncContext = createContext(false);
export const useRecurringSyncReady = () => useContext(RecurringSyncContext);
