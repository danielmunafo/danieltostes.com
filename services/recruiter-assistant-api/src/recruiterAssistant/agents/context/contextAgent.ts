import { createRecruiterContext } from "./createRecruiterContext.js";

export const contextAgent = {
  createContext: createRecruiterContext,
} as const;
