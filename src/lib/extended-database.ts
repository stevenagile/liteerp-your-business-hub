import type { Database, Json } from "@/integrations/supabase/types";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
type Schema<Tables, Functions = Record<never, never>, Views = Record<never, never>> = {
  Tables: Tables; Functions: Functions; Views: Views;
  Enums: Record<never, never>; CompositeTypes: Record<never, never>;
};
type Menu = { id: string; parent_id: string | null; label: string; route: string | null; icon: string | null; sort_order: number | null; is_active: boolean; is_system: boolean };
type Access = { role: string; menu_id: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_approve: boolean };
type User = { id: string; email: string | null; display_name: string | null; role: string | null; is_active: boolean; last_login_at: string | null };
type Role = { code: string; label: string };
type Agent = { id: string; company_id: string; name: string; jd: string | null; system_prompt: string | null; department_id: string | null; status: "draft" | "active" | "archived"; created_at: string | null };
type Skill = { id: string; company_id: string; name: string; description: string | null; reversible: boolean; json_schema: Json; created_at: string | null };
type Node = { id: string; company_id: string; parent_id: string | null; type: "department" | "topic"; name: string; path: string; description: string | null; metadata: Json | null; created_at: string | null; updated_at: string | null };
type Document = { id: string; company_id: string; node_id: string; filename: string; storage_path: string; mime_type: string | null; file_size_bytes: number; status: string; uploaded_by: string; created_at: string | null };

// Page contracts for existing external schemas; these declarations do not alter the database.
export type ERPDatabase = Database & {
  core: Schema<{
    menu_items: Table<Menu, "id" | "label">;
    menu_role_access: Table<Access, "role" | "menu_id">;
    users: Table<User>;
    roles: Table<Role, "code" | "label">;
    agent_logs: Table<{ id: string; company_id: string; created_at: string | null; agent_name: string | null; action: string | null; resource: string | null; resource_id: string | null; response_status: number | null; error_message: string | null; request_summary: string | null }>;
  }, {
    has_menu_access: { Args: { p_menu: string; p_action: string }; Returns: boolean };
    current_company: { Args: never; Returns: string };
    get_my_menu: { Args: never; Returns: (Menu & Partial<Access>)[] };
    touch_last_login: { Args: never; Returns: undefined };
    list_users: { Args: never; Returns: User[] };
    list_roles: { Args: never; Returns: Role[] };
    admin_update_user: { Args: { p_id: string; p_role?: string; p_is_active?: boolean; p_display_name?: string | null }; Returns: undefined };
  }>;
  agent: Schema<{
    agents: Table<Agent, "name">;
    departments: Table<{ id: string; company_id: string; name: string }>;
    skills: Table<Skill, "name">;
    agent_skills: Table<{ agent_id: string; skill_id: string; enabled: boolean }, "agent_id" | "skill_id">;
  }>;
  channel: Schema<{
    managers: Table<{ company_id: string; line_user_id: string; display_name: string | null; is_active: boolean; created_at: string | null; kind: "user" | "group" }, "line_user_id">;
    customer_term_aliases: Table<{ id: string; company_id: string; alias_text: string; product_id: string | null; confirm_count: number; contact_id: string | null; disabled: boolean; last_used_at: string | null }>;
  }, Record<never, never>, {
    v_terms_to_learn: { Row: { company_id: string; contact_id: string | null; raw_message: string; issues: Json | null; created_at: string | null }; Relationships: [] };
  }>;
  knowledge: Schema<{
    nodes: Table<Node, "company_id" | "type" | "name" | "path">;
    documents: Table<Document, "company_id" | "node_id" | "filename" | "storage_path" | "uploaded_by">;
  }>;
};