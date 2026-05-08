import {
    fetchMultiplyStrategies,
    fetchMultiplyStrategyById,
} from "@/api/multiply.api";
import { useQuery } from "@tanstack/react-query";

export const multiplyKeys = {
  all: ["multiply"] as const,
  byId: (id: string) => ["multiply", id] as const,
};

export function useMultiplyStrategies() {
  return useQuery({
    queryKey: multiplyKeys.all,
    queryFn: fetchMultiplyStrategies,
  });
}

export function useMultiplyStrategy(id: string | undefined) {
  return useQuery({
    queryKey: multiplyKeys.byId(id ?? ""),
    queryFn: () => fetchMultiplyStrategyById(id!),
    enabled: !!id,
  });
}
