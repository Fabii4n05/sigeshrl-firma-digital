CREATE TABLE nfc_trials (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), document_id TEXT NOT NULL REFERENCES documents(id), payload TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE nfc_proofs (id TEXT PRIMARY KEY, trial_id TEXT NOT NULL UNIQUE REFERENCES nfc_trials(id), document_id TEXT NOT NULL REFERENCES documents(id), user_id TEXT NOT NULL REFERENCES users(id), proof TEXT NOT NULL, verified_at TEXT NOT NULL);
