export type Role =
  "medico" | "enfermeria" | "admision" | "supervision" | "farmacia" | "admin";
export type Row = Record<string, any>;
export interface Result {
  success: boolean;
  meta?: { changes?: number };
  results?: Row[];
}
export interface Statement {
  bind(...values: any[]): Statement;
  first<T = Row>(): Promise<T | null>;
  all<T = Row>(): Promise<{ results: T[] }>;
  run(): Promise<Result>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<Result[]>;
}
export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  service: string;
  specialty: string;
  detail_permission: number;
  enabled: number;
}
export interface Env {
  DB: Database;
  ASSETS?: { fetch(request: Request): Promise<Response> };
}
export type ContextType = {
  Bindings: Env;
  Variables: { user: User; tokenHash: string };
};
