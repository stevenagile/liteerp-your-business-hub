import { useAuth } from "@/context/AuthContext";

/**
 * FE-01: 取得目前使用者的 company_id
 * 用於查詢時加上 .eq("company_id", companyId) 作為縱深防禦
 */
export function useCompanyId(): string | null {
  const { profile } = useAuth();
  return profile?.company_id ?? null;
}
