import { invoke } from "@tauri-apps/api/core";

export interface LatticeParameter {
  value: number;
  uncertainty?: number;
}

export interface AtomSite {
  label: string;
  type_symbol: string;
  fract_x: number;
  fract_y: number;
  fract_z: number;
  wyckoff_symbol?: string;
  symmetry_multiplicity?: number;
  occupancy: number;
}

export interface AnisotropicParams {
  label: string;
  type_symbol: string;
  beta_11: number;
  beta_22: number;
  beta_33: number;
  beta_12: number;
  beta_13: number;
  beta_23: number;
}

export interface Citation {
  title?: string;
  journal?: string;
  year?: number;
  volume?: string;
  page_first?: string;
  page_last?: string;
  authors: string[];
}

export interface CrystalData {
  // Names
  chemical_name_common?: string;
  formula_structural?: string;
  formula_sum?: string;
  structure_type?: string;

  // Cell
  cell_length_a: LatticeParameter;
  cell_length_b: LatticeParameter;
  cell_length_c: LatticeParameter;
  cell_angle_alpha: LatticeParameter;
  cell_angle_beta: LatticeParameter;
  cell_angle_gamma: LatticeParameter;
  cell_volume?: number;
  cell_formula_units_Z?: number;

  // Space group
  space_group_HM?: string;
  space_group_IT_number?: number;

  // Physical
  density?: number;
  measurement_temperature?: number;

  // Source
  database_code?: string;
  audit_creation_date?: string;
  citation?: Citation;

  // Structure
  atom_sites: AtomSite[];
  symmetry_operations: string[];
  anisotropic_params: AnisotropicParams[];
}

export interface Project {
  id: string;
  name: string;
  formula: string;
  created_at: string;
  updated_at: string;
  has_cif: boolean;
  cif_filename?: string;
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

export async function importCIFFile(
  projectId: string,
  sourcePath: string,
  originalFilename: string
): Promise<Project> {
  return invoke<Project>("import_cif_file", {
    projectId,
    sourcePath,
    originalFilename,
  });
}

export async function readCIFFile(projectId: string): Promise<string> {
  return invoke<string>("read_cif_file", { projectId });
}

export async function saveCrystalData(
  projectId: string,
  crystalData: CrystalData
): Promise<void> {
  const crystalDataJson = JSON.stringify(crystalData);
  return invoke<void>("save_crystal_data", { projectId, crystalDataJson });
}

export async function loadCrystalData(
  projectId: string
): Promise<CrystalData | null> {
  const json = await invoke<string | null>("load_crystal_data", { projectId });
  if (json) {
    return JSON.parse(json) as CrystalData;
  }
  return null;
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
