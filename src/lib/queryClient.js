import { QueryClient } from "@tanstack/react-query";
import { isNativeApp } from "../utils/nativeRuntime";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: isNativeApp() ? 60 * 1000 : 30 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: !isNativeApp(),
      refetchOnReconnect: true,
      networkMode: "always"
    },
    mutations: {
      retry: 0,
      networkMode: "always"
    }
  }
});
