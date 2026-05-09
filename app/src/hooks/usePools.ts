import { fetchPoolById, fetchPools } from "@/api/pools.api";
import { useQuery } from "@tanstack/react-query";

export const poolKeys = {
  all: ["pools"] as const,
  byId: (id: string) => ["pools", id] as const,
};

export function usePools() {
  return useQuery({
    queryKey: poolKeys.all,
    queryFn: fetchPools,
  });
}

export function usePool(id: string | undefined) {
  return useQuery({
    queryKey: poolKeys.byId(id ?? ""),
    queryFn: () => fetchPoolById(id!),
    enabled: !!id,
  });
}
