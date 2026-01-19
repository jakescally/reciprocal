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
            load_crystal_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
