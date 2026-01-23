use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::thread;
use std::time::Duration;
use tauri::Emitter;
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
    pub has_cif: bool,
    pub cif_filename: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct SiriusLogEvent {
    run_id: String,
    level: String,
    message: String,
    timestamp: String,
}

#[derive(Debug, Serialize, Clone)]
struct SiriusStatusEvent {
    run_id: String,
    status: String,
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

    // Sort by updated_at descending (most recent first)
    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

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

fn get_project_dir(app: &tauri::AppHandle, project_id: &str) -> Result<PathBuf, String> {
    let projects_dir = get_projects_dir(app)?;
    let project_dir = projects_dir.join(project_id);

    if !project_dir.exists() {
        return Err(format!("Project directory for {} not found", project_id));
    }

    Ok(project_dir)
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

#[tauri::command]
fn start_sirius_run(app: tauri::AppHandle, project_id: String) -> Result<String, String> {
    let run_id = Uuid::new_v4().to_string();
    let app_handle = app.clone();
    let run_id_clone = run_id.clone();

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(200));
        let _ = app_handle.emit(
            "sirius-status",
            SiriusStatusEvent {
                run_id: run_id_clone.clone(),
                status: "running".to_string(),
            },
        );

        let messages = vec![
            "Initializing SIRIUS run",
            "Reading structure data",
            "Building basis and k-mesh",
            "Starting SCF loop",
            "SCF iteration 1/8",
            "SCF iteration 4/8",
            "SCF iteration 8/8",
            "Finalizing outputs",
            "Run complete",
        ];

        for message in messages {
            thread::sleep(Duration::from_millis(420));
            let _ = app_handle.emit(
                "sirius-log",
                SiriusLogEvent {
                    run_id: run_id_clone.clone(),
                    level: "info".to_string(),
                    message: message.to_string(),
                    timestamp: Utc::now().to_rfc3339(),
                },
            );
        }

        let _ = app_handle.emit(
            "sirius-status",
            SiriusStatusEvent {
                run_id: run_id_clone,
                status: "completed".to_string(),
            },
        );
    });

    let _ = project_id;
    Ok(run_id)
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
            start_sirius_run
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
