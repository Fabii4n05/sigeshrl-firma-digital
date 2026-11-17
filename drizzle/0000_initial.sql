CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, service TEXT NOT NULL, specialty TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, salt TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, detail_permission INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE auth_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE patients (id TEXT PRIMARY KEY, dni TEXT NOT NULL UNIQUE, name TEXT NOT NULL, history TEXT NOT NULL UNIQUE, birth_date TEXT NOT NULL, sex TEXT NOT NULL, allergies TEXT NOT NULL DEFAULT 'Sin alergias registradas');
--> statement-breakpoint
CREATE TABLE appointments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), professional_id TEXT NOT NULL REFERENCES users(id), service TEXT NOT NULL, specialty TEXT NOT NULL, room TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX appointments_date ON appointments(date, service, professional_id);
--> statement-breakpoint
CREATE TABLE encounters (id TEXT PRIMARY KEY, appointment_id TEXT NOT NULL UNIQUE REFERENCES appointments(id), reason TEXT NOT NULL DEFAULT '', diagnosis TEXT NOT NULL DEFAULT '', evolution TEXT NOT NULL DEFAULT '', prescription TEXT NOT NULL DEFAULT '[]', nursing TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, edit_token TEXT);
--> statement-breakpoint
CREATE TABLE documents (id TEXT PRIMARY KEY, encounter_id TEXT NOT NULL REFERENCES encounters(id), type TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id), version INTEGER NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', is_current INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, last_error TEXT);
--> statement-breakpoint
CREATE UNIQUE INDEX current_document ON documents(encounter_id, type) WHERE is_current = 1;
--> statement-breakpoint
CREATE TABLE signatures (id TEXT PRIMARY KEY, document_id TEXT NOT NULL UNIQUE REFERENCES documents(id), signer_id TEXT NOT NULL REFERENCES users(id), signer_name TEXT NOT NULL, signed_at TEXT NOT NULL, sha256 TEXT NOT NULL, placement TEXT NOT NULL, method TEXT NOT NULL DEFAULT 'SIMULACION_ACADEMICA');
--> statement-breakpoint
CREATE TABLE dispensations (id TEXT PRIMARY KEY, document_id TEXT NOT NULL UNIQUE REFERENCES documents(id), user_id TEXT NOT NULL REFERENCES users(id), dispensed_at TEXT NOT NULL, items TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE audit_events (id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT NOT NULL, action TEXT NOT NULL, record_id TEXT, result TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX audit_created ON audit_events(created_at);
--> statement-breakpoint
CREATE TABLE demo_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
