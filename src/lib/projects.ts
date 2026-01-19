import { invoke } from "@tauri-apps/api/core";

export interface Project {
  id: string;
  name: string;
  formula: string;
  created_at: string;
  updated_at: string;
}

export async function loadProjects(): Promise<Project[]> {
  return invoke<Project[]>("load_projects");
}

export async function createProject(
  name: string,
  formula: string
): Promise<Project> {
  return invoke<Project>("create_project", { name, formula });
}

export async function updateProject(project: Project): Promise<Project> {
  return invoke<Project>("update_project", { project });
}

export async function deleteProject(id: string): Promise<void> {
  return invoke<void>("delete_project", { id });
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  } else if (diffWeeks < 4) {
    return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
  } else {
    return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
  }
}
