import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractResponseData } from "../services/api";
import { getDashboardSocket } from "../services/socketClient";

export function useApiQuery({
  queryKey,
  url,
  config,
  select,
  enabled = true,
  ...options
}) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get(url, config);
      return extractResponseData(response);
    },
    select,
    enabled,
    ...options
  });
}

export function useApiMutation({ mutationFn, ...options }) {
  return useMutation({
    mutationFn: async (variables) => mutationFn(api, variables),
    ...options
  });
}

export function useSocketQueryInvalidation(queryKey, events = [], enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || events.length === 0) return undefined;

    const socket = getDashboardSocket();
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey });
    };

    events.forEach((eventName) => {
      socket.on(eventName, invalidate);
    });

    return () => {
      events.forEach((eventName) => {
        socket.off(eventName, invalidate);
      });
    };
  }, [enabled, events, queryClient, queryKey]);
}
