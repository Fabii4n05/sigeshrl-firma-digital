import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Database, Statement, Result } from "./types";
export class SQLiteAdapter implements Database {
  raw: DatabaseSync;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(filename: string) {
    if (filename !== ":memory:")
      mkdirSync(path.dirname(filename), { recursive: true });
    this.raw = new DatabaseSync(filename);
    this.raw.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
    this.raw.exec(
      "CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)",
    );
    for (const file of readdirSync("drizzle")
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      const name = file.slice(0, -4);
      if (
        this.raw
          .prepare("SELECT name FROM _local_migrations WHERE name=?")
          .get(name)
      )
        continue;
      this.raw.exec("BEGIN IMMEDIATE");
      try {
        this.raw.exec(readFileSync(path.join("drizzle", file), "utf8"));
        this.raw
          .prepare("INSERT INTO _local_migrations(name) VALUES (?)")
          .run(name);
        this.raw.exec("COMMIT");
      } catch (e) {
        this.raw.exec("ROLLBACK");
        throw e;
      }
    }
  }
  prepare(sql: string): Statement {
    const raw = this.raw;
    function make(values: any[] = []): Statement {
      return {
        bind(...next: any[]) {
          return make(next);
        },
        async first<T>() {
          return (raw.prepare(sql).get(...values) as T) ?? null;
        },
        async all<T>() {
          return { results: raw.prepare(sql).all(...values) as T[] };
        },
        async run() {
          const result = raw.prepare(sql).run(...values);
          return { success: true, meta: { changes: Number(result.changes) } };
        },
      };
    }
    return make();
  }
  batch(statements: Statement[]): Promise<Result[]> {
    const run = this.queue.then(async () => {
      this.raw.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        this.raw.exec("COMMIT");
        return results;
      } catch (e) {
        this.raw.exec("ROLLBACK");
        throw e;
      }
    });
    this.queue = run.catch(() => {});
    return run;
  }
}
