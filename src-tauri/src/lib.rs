use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub formula: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub last_opened_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub has_cif: bool,
    pub cif_filename: Option<String>,
}

fn get_projects_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let projects_dir = app_data_dir.join("projects");

    if !projects_dir.exists() {
        fs::create_dir_all(&projects_dir)
            .map_err(|e| format!("Failed to create projects directory: {}", e))?;
    }

    Ok(projects_dir)
}

fn get_project_dir(app: &tauri::AppHandle, project_id: &str) -> Result<PathBuf, String> {
    let projects_dir = get_projects_dir(app)?;
    let project_dir = projects_dir.join(project_id);
    if !project_dir.exists() {
        return Err(format!("Project with id {} not found", project_id));
    }
    Ok(project_dir)
}

#[tauri::command]
fn load_projects(app: tauri::AppHandle) -> Result<Vec<Project>, String> {
    let projects_dir = get_projects_dir(&app)?;
    let mut projects = Vec::new();

    let entries = fs::read_dir(&projects_dir)
        .map_err(|e| format!("Failed to read projects directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        // Each project is a directory containing project.json
        if path.is_dir() {
            let project_file = path.join("project.json");
            if project_file.exists() {
                let content = fs::read_to_string(&project_file)
                    .map_err(|e| format!("Failed to read project file: {}", e))?;

                let project: Project = serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse project file: {}", e))?;

                projects.push(project);
            }
        }
    }

    // Sort by last_opened_at descending (most recently opened first), fall back to created_at
    projects.sort_by(|a, b| {
        let a_time = a.last_opened_at.unwrap_or(a.created_at);
        let b_time = b.last_opened_at.unwrap_or(b.created_at);
        b_time.cmp(&a_time)
    });

    Ok(projects)
}

#[tauri::command]
fn create_project(app: tauri::AppHandle, name: String, formula: String) -> Result<Project, String> {
    let projects_dir = get_projects_dir(&app)?;

    let now = Utc::now();
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        formula,
        created_at: now,
        updated_at: now,
        last_opened_at: Some(now),
        has_cif: false,
        cif_filename: None,
    };

    // Create project directory
    let project_dir = projects_dir.join(&project.id);
    fs::create_dir_all(&project_dir)
        .map_err(|e| format!("Failed to create project directory: {}", e))?;

    // Save project.json inside the directory
    let project_file = project_dir.join("project.json");
    let content = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;

    fs::write(&project_file, content)
        .map_err(|e| format!("Failed to write project file: {}", e))?;

    Ok(project)
}

#[tauri::command]
fn update_project(app: tauri::AppHandle, project: Project) -> Result<Project, String> {
    let projects_dir = get_projects_dir(&app)?;
    let project_dir = projects_dir.join(&project.id);
    let project_file = project_dir.join("project.json");

    if !project_file.exists() {
        return Err(format!("Project with id {} not found", project.id));
    }

    let mut updated_project = project;
    updated_project.updated_at = Utc::now();

    let content = serde_json::to_string_pretty(&updated_project)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;

    fs::write(&project_file, content)
        .map_err(|e| format!("Failed to write project file: {}", e))?;

    Ok(updated_project)
}

#[tauri::command]
fn mark_project_opened(app: tauri::AppHandle, project_id: String) -> Result<Project, String> {
    let projects_dir = get_projects_dir(&app)?;
    let project_dir = projects_dir.join(&project_id);
    let project_file = project_dir.join("project.json");

    if !project_file.exists() {
        return Err(format!("Project with id {} not found", project_id));
    }

    // Read existing project
    let content = fs::read_to_string(&project_file)
        .map_err(|e| format!("Failed to read project file: {}", e))?;
    let mut project: Project = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project file: {}", e))?;

    // Update last_opened_at
    project.last_opened_at = Some(Utc::now());

    // Save updated project
    let updated_content = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;
    fs::write(&project_file, updated_content)
        .map_err(|e| format!("Failed to write project file: {}", e))?;

    Ok(project)
}

#[tauri::command]
fn delete_project(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let projects_dir = get_projects_dir(&app)?;
    let project_dir = projects_dir.join(&id);

    if !project_dir.exists() {
        return Err(format!("Project with id {} not found", id));
    }

    fs::remove_dir_all(&project_dir)
        .map_err(|e| format!("Failed to delete project directory: {}", e))?;

    Ok(())
}

#[tauri::command]
fn import_cif_file(
    app: tauri::AppHandle,
    project_id: String,
    source_path: String,
    original_filename: String,
) -> Result<Project, String> {
    let project_dir = get_project_dir(&app, &project_id)?;
    let project_file = project_dir.join("project.json");

    // Read existing project
    let content = fs::read_to_string(&project_file)
        .map_err(|e| format!("Failed to read project file: {}", e))?;
    let mut project: Project = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project file: {}", e))?;

    // Copy CIF file to project directory as structure.cif
    let dest_path = project_dir.join("structure.cif");
    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy CIF file: {}", e))?;

    // Update project metadata
    project.has_cif = true;
    project.cif_filename = Some(original_filename);
    project.updated_at = Utc::now();

    // Save updated project
    let updated_content = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;
    fs::write(&project_file, updated_content)
        .map_err(|e| format!("Failed to write project file: {}", e))?;

    Ok(project)
}

#[tauri::command]
fn read_cif_file(app: tauri::AppHandle, project_id: String) -> Result<String, String> {
    let project_dir = get_project_dir(&app, &project_id)?;
    let cif_path = project_dir.join("structure.cif");

    if !cif_path.exists() {
        return Err("CIF file not found".to_string());
    }

    fs::read_to_string(&cif_path)
        .map_err(|e| format!("Failed to read CIF file: {}", e))
}

#[tauri::command]
fn save_crystal_data(
    app: tauri::AppHandle,
    project_id: String,
    crystal_data_json: String,
) -> Result<(), String> {
    let project_dir = get_project_dir(&app, &project_id)?;
    let data_path = project_dir.join("cif_data.json");

    fs::write(&data_path, crystal_data_json)
        .map_err(|e| format!("Failed to save crystal data: {}", e))?;

    Ok(())
}

#[tauri::command]
fn load_crystal_data(app: tauri::AppHandle, project_id: String) -> Result<Option<String>, String> {
    let project_dir = get_project_dir(&app, &project_id)?;
    let data_path = project_dir.join("cif_data.json");

    if !data_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&data_path)
        .map_err(|e| format!("Failed to read crystal data: {}", e))?;

    Ok(Some(content))
}

// ============ Band Structure Commands ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BandStructureInfo {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub qtl_filename: String,
    pub klist_filename: String,
}

fn get_band_structures_dir(app: &tauri::AppHandle, project_id: &str) -> Result<PathBuf, String> {
    let project_dir = get_project_dir(app, project_id)?;
    let band_dir = project_dir.join("band_structures");

    if !band_dir.exists() {
        fs::create_dir_all(&band_dir)
            .map_err(|e| format!("Failed to create band_structures directory: {}", e))?;
    }

    Ok(band_dir)
}

#[tauri::command]
fn import_band_structure(
    app: tauri::AppHandle,
    project_id: String,
    name: String,
    qtl_source_path: String,
    qtl_filename: String,
    klist_source_path: String,
    klist_filename: String,
) -> Result<BandStructureInfo, String> {
    let band_dir = get_band_structures_dir(&app, &project_id)?;

    let id = Uuid::new_v4().to_string();
    let band_path = band_dir.join(&id);
    fs::create_dir_all(&band_path)
        .map_err(|e| format!("Failed to create band structure directory: {}", e))?;

    // Copy .qtl file
    let qtl_dest = band_path.join("data.qtl");
    fs::copy(&qtl_source_path, &qtl_dest)
        .map_err(|e| format!("Failed to copy QTL file: {}", e))?;

    // Copy .klist_band file
    let klist_dest = band_path.join("data.klist_band");
    fs::copy(&klist_source_path, &klist_dest)
        .map_err(|e| format!("Failed to copy klist_band file: {}", e))?;

    let info = BandStructureInfo {
        id,
        name,
        created_at: Utc::now(),
        qtl_filename,
        klist_filename,
    };

    // Save metadata
    let info_path = band_path.join("info.json");
    let content = serde_json::to_string_pretty(&info)
        .map_err(|e| format!("Failed to serialize band structure info: {}", e))?;
    fs::write(&info_path, content)
        .map_err(|e| format!("Failed to write band structure info: {}", e))?;

    Ok(info)
}

#[tauri::command]
fn list_band_structures(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<BandStructureInfo>, String> {
    let band_dir = get_band_structures_dir(&app, &project_id)?;
    let mut results = Vec::new();

    if let Ok(entries) = fs::read_dir(&band_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let info_path = path.join("info.json");
                if info_path.exists() {
                    if let Ok(content) = fs::read_to_string(&info_path) {
                        if let Ok(info) = serde_json::from_str::<BandStructureInfo>(&content) {
                            results.push(info);
                        }
                    }
                }
            }
        }
    }

    // Sort by created_at descending
    results.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(results)
}

#[tauri::command]
fn load_band_structure_files(
    app: tauri::AppHandle,
    project_id: String,
    band_structure_id: String,
) -> Result<(String, String), String> {
    let band_dir = get_band_structures_dir(&app, &project_id)?;
    let band_path = band_dir.join(&band_structure_id);

    if !band_path.exists() {
        return Err(format!("Band structure {} not found", band_structure_id));
    }

    let qtl_content = fs::read_to_string(band_path.join("data.qtl"))
        .map_err(|e| format!("Failed to read QTL file: {}", e))?;

    let klist_content = fs::read_to_string(band_path.join("data.klist_band"))
        .map_err(|e| format!("Failed to read klist_band file: {}", e))?;

    Ok((qtl_content, klist_content))
}

#[tauri::command]
fn delete_band_structure(
    app: tauri::AppHandle,
    project_id: String,
    band_structure_id: String,
) -> Result<(), String> {
    let band_dir = get_band_structures_dir(&app, &project_id)?;
    let band_path = band_dir.join(&band_structure_id);

    if !band_path.exists() {
        return Err(format!("Band structure {} not found", band_structure_id));
    }

    fs::remove_dir_all(&band_path)
        .map_err(|e| format!("Failed to delete band structure: {}", e))?;

    Ok(())
}

#[tauri::command]
fn update_band_structure_labels(
    app: tauri::AppHandle,
    project_id: String,
    band_structure_id: String,
    labels_json: String,
) -> Result<(), String> {
    let band_dir = get_band_structures_dir(&app, &project_id)?;
    let band_path = band_dir.join(&band_structure_id);

    if !band_path.exists() {
        return Err(format!("Band structure {} not found", band_structure_id));
    }

    let labels_path = band_path.join("labels.json");
    fs::write(&labels_path, labels_json)
        .map_err(|e| format!("Failed to save labels: {}", e))?;

    Ok(())
}

#[tauri::command]
fn load_band_structure_labels(
    app: tauri::AppHandle,
    project_id: String,
    band_structure_id: String,
) -> Result<Option<String>, String> {
    let band_dir = get_band_structures_dir(&app, &project_id)?;
    let band_path = band_dir.join(&band_structure_id);
    let labels_path = band_path.join("labels.json");

    if !labels_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&labels_path)
        .map_err(|e| format!("Failed to read labels: {}", e))?;

    Ok(Some(content))
}

#[tauri::command]
fn update_band_structure_atom_names(
    app: tauri::AppHandle,
    project_id: String,
    band_structure_id: String,
    atom_names_json: String,
) -> Result<(), String> {
    let band_dir = get_band_structures_dir(&app, &project_id)?;
    let band_path = band_dir.join(&band_structure_id);

    if !band_path.exists() {
        return Err(format!("Band structure {} not found", band_structure_id));
    }

    let names_path = band_path.join("atom_names.json");
    fs::write(&names_path, atom_names_json)
        .map_err(|e| format!("Failed to save atom names: {}", e))?;

    Ok(())
}

#[tauri::command]
fn load_band_structure_atom_names(
    app: tauri::AppHandle,
    project_id: String,
    band_structure_id: String,
) -> Result<Option<String>, String> {
    let band_dir = get_band_structures_dir(&app, &project_id)?;
    let band_path = band_dir.join(&band_structure_id);
    let names_path = band_path.join("atom_names.json");

    if !names_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&names_path)
        .map_err(|e| format!("Failed to read atom names: {}", e))?;

    Ok(Some(content))
}

// ============ Fermi Surface Commands ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FermiSurfaceInfo {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub case_name: String,
}

fn get_fermi_surfaces_dir(app: &tauri::AppHandle, project_id: &str) -> Result<PathBuf, String> {
    let project_dir = get_project_dir(app, project_id)?;
    let fermi_dir = project_dir.join("fermi_surfaces");

    if !fermi_dir.exists() {
        fs::create_dir_all(&fermi_dir)
            .map_err(|e| format!("Failed to create fermi_surfaces directory: {}", e))?;
    }

    Ok(fermi_dir)
}

#[tauri::command]
fn import_fermi_surface(
    app: tauri::AppHandle,
    project_id: String,
    name: String,
    output1_source_path: String,
    output2_source_path: String,
    outputkgen_source_path: String,
    struct_source_path: String,
    case_name: String,
) -> Result<FermiSurfaceInfo, String> {
    let fermi_dir = get_fermi_surfaces_dir(&app, &project_id)?;

    let id = Uuid::new_v4().to_string();
    let fermi_path = fermi_dir.join(&id);
    fs::create_dir_all(&fermi_path)
        .map_err(|e| format!("Failed to create fermi surface directory: {}", e))?;

    // Copy output1 file
    let output1_dest = fermi_path.join("data.output1");
    fs::copy(&output1_source_path, &output1_dest)
        .map_err(|e| format!("Failed to copy output1 file: {}", e))?;

    // Copy output2 file
    let output2_dest = fermi_path.join("data.output2");
    fs::copy(&output2_source_path, &output2_dest)
        .map_err(|e| format!("Failed to copy output2 file: {}", e))?;

    // Copy outputkgen file
    let outputkgen_dest = fermi_path.join("data.outputkgen");
    fs::copy(&outputkgen_source_path, &outputkgen_dest)
        .map_err(|e| format!("Failed to copy outputkgen file: {}", e))?;

    // Copy .struct file
    let struct_dest = fermi_path.join("data.struct");
    fs::copy(&struct_source_path, &struct_dest)
        .map_err(|e| format!("Failed to copy struct file: {}", e))?;

    let info = FermiSurfaceInfo {
        id,
        name,
        created_at: Utc::now(),
        case_name,
    };

    // Save metadata
    let info_path = fermi_path.join("info.json");
    let content = serde_json::to_string_pretty(&info)
        .map_err(|e| format!("Failed to serialize fermi surface info: {}", e))?;
    fs::write(&info_path, content)
        .map_err(|e| format!("Failed to write fermi surface info: {}", e))?;

    Ok(info)
}

#[tauri::command]
fn list_fermi_surfaces(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<FermiSurfaceInfo>, String> {
    let fermi_dir = get_fermi_surfaces_dir(&app, &project_id)?;
    let mut results = Vec::new();

    if let Ok(entries) = fs::read_dir(&fermi_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let info_path = path.join("info.json");
                if info_path.exists() {
                    if let Ok(content) = fs::read_to_string(&info_path) {
                        if let Ok(info) = serde_json::from_str::<FermiSurfaceInfo>(&content) {
                            results.push(info);
                        }
                    }
                }
            }
        }
    }

    // Sort by created_at descending
    results.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(results)
}

#[tauri::command]
fn load_fermi_surface_files(
    app: tauri::AppHandle,
    project_id: String,
    fermi_surface_id: String,
) -> Result<(String, String, String, String), String> {
    let fermi_dir = get_fermi_surfaces_dir(&app, &project_id)?;
    let fermi_path = fermi_dir.join(&fermi_surface_id);

    if !fermi_path.exists() {
        return Err(format!("Fermi surface {} not found", fermi_surface_id));
    }

    let output1_content = fs::read_to_string(fermi_path.join("data.output1"))
        .map_err(|e| format!("Failed to read output1 file: {}", e))?;

    let output2_content = fs::read_to_string(fermi_path.join("data.output2"))
        .map_err(|e| format!("Failed to read output2 file: {}", e))?;

    let outputkgen_content = fs::read_to_string(fermi_path.join("data.outputkgen"))
        .map_err(|e| format!("Failed to read outputkgen file: {}", e))?;

    let struct_content = fs::read_to_string(fermi_path.join("data.struct"))
        .map_err(|e| format!("Failed to read struct file: {}", e))?;

    Ok((output1_content, output2_content, outputkgen_content, struct_content))
}

#[tauri::command]
fn delete_fermi_surface(
    app: tauri::AppHandle,
    project_id: String,
    fermi_surface_id: String,
) -> Result<(), String> {
    let fermi_dir = get_fermi_surfaces_dir(&app, &project_id)?;
    let fermi_path = fermi_dir.join(&fermi_surface_id);

    if !fermi_path.exists() {
        return Err(format!("Fermi surface {} not found", fermi_surface_id));
    }

    fs::remove_dir_all(&fermi_path)
        .map_err(|e| format!("Failed to delete fermi surface: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            load_projects,
            create_project,
            update_project,
            mark_project_opened,
            delete_project,
            import_cif_file,
            read_cif_file,
            save_crystal_data,
            load_crystal_data,
            import_band_structure,
            list_band_structures,
            load_band_structure_files,
            delete_band_structure,
            update_band_structure_labels,
            load_band_structure_labels,
            update_band_structure_atom_names,
            load_band_structure_atom_names,
            import_fermi_surface,
            list_fermi_surfaces,
            load_fermi_surface_files,
            delete_fermi_surface
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
