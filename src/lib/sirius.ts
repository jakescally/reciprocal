import { invoke } from "@tauri-apps/api/core";

export type SiriusLogEvent = {
  run_id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
};

export type SiriusStatusEvent = {
  run_id: string;
  status: "running" | "completed" | "failed";
};

export async function startSiriusRun(projectId: string): Promise<string> {
  return invoke<string>("start_sirius_run", { projectId });
}
