import { useState, useEffect } from "react";
import { FloatingLogo } from "./components/FloatingLogo";
import { FloatingMenu } from "./components/FloatingMenu";
import { MaterialCard } from "./components/MaterialCard";
import { AddMaterialCard } from "./components/AddMaterialCard";
import { ToolCard } from "./components/ToolCard";
import { NewProjectCard } from "./components/NewProjectCard";
import { ProjectPage } from "./components/ProjectPage";
import { BandStructurePage } from "./components/BandStructurePage";
import { BrillouinZonePage } from "./components/BrillouinZonePage";
import { FermiSurfacePage } from "./components/FermiSurfacePage";
import { SiriusSolverPage } from "./components/SiriusSolverPage";
import { cn } from "./lib/utils";
import {
  Project,
  loadProjects,
  createProject,
  updateProject,
  deleteProject,
  formatRelativeTime,
} from "./lib/projects";

type MiniApp = "band-structure" | "dos" | "brillouin-zone" | "fermi-surface" | "sirius";

type View =
  | { type: "dashboard" }
  | { type: "transitioning-to-project"; project: Project }
  | { type: "project"; project: Project }
  | { type: "transitioning-to-dashboard"; project: Project }
  | { type: "miniapp"; project: Project; miniApp: MiniApp }
  | { type: "transitioning-to-miniapp"; project: Project; miniApp: MiniApp }
  | { type: "transitioning-from-miniapp"; project: Project; miniApp: MiniApp };

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>({ type: "dashboard" });

  const [showNewProject, setShowNewProject] = useState(false);
  const [peekNewProject, setPeekNewProject] = useState(false);
  const [newProjectKey, setNewProjectKey] = useState(0);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editProjectKey, setEditProjectKey] = useState(0);

  useEffect(() => {
    loadProjects()
      .then((loadedProjects) => {
        setProjects(loadedProjects);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load projects:", err);
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const handleOpenNewProject = () => {
    setPeekNewProject(false);
    setShowNewProject(true);
  };

  const handleCloseNewProject = () => {
    setShowNewProject(false);
    setNewProjectKey((k) => k + 1);
  };

  const handleCreateProject = async (name: string, formula: string) => {
    try {
      const newProject = await createProject(name, formula);
      setProjects((prev) => [newProject, ...prev]);
      setNewlyCreatedId(newProject.id);
      handleCloseNewProject();

      setTimeout(() => setNewlyCreatedId(null), 2000);
    } catch (err) {
      console.error("Failed to create project:", err);
      setError(String(err));
    }
  };

  const handleOpenProject = (project: Project) => {
    setCurrentView({ type: "transitioning-to-project", project });
    setTimeout(() => {
      setCurrentView({ type: "project", project });
    }, 400);
  };

  const handleBackToDashboard = () => {
    if (currentView.type === "project") {
      setCurrentView({ type: "transitioning-to-dashboard", project: currentView.project });
      setTimeout(() => {
        setCurrentView({ type: "dashboard" });
      }, 400);
    }
  };

  const handleOpenMiniApp = (miniApp: MiniApp) => {
    if (currentView.type === "project") {
      setCurrentView({ type: "transitioning-to-miniapp", project: currentView.project, miniApp });
      setTimeout(() => {
        setCurrentView({ type: "miniapp", project: currentView.project, miniApp });
      }, 400);
    }
  };

  const handleBackToProject = () => {
    if (currentView.type === "miniapp") {
      setCurrentView({ type: "transitioning-from-miniapp", project: currentView.project, miniApp: currentView.miniApp });
      setTimeout(() => {
        setCurrentView({ type: "project", project: currentView.project });
      }, 400);
    }
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    // Update in projects array
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
    // Update current view if on this project
    if (currentView.type === "project" && currentView.project.id === updatedProject.id) {
      setCurrentView({ type: "project", project: updatedProject });
    }
  };

  const handleDeleteProject = async () => {
    if (currentView.type !== "project") return;

    const projectId = currentView.project.id;
    try {
      await deleteProject(projectId);
      // Remove from projects array
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      // Navigate back to dashboard
      handleBackToDashboard();
    } catch (err) {
      console.error("Failed to delete project:", err);
      setError(String(err));
    }
  };

  const handleOpenEditProject = () => {
    setShowEditProject(true);
  };

  const handleCloseEditProject = () => {
    setShowEditProject(false);
    setEditProjectKey((k) => k + 1);
  };

  const handleSaveProject = async (name: string, formula: string) => {
    if (currentView.type !== "project") return;

    try {
      const updatedProject = await updateProject({
        ...currentView.project,
        name,
        formula,
      });
      handleProjectUpdate(updatedProject);
      handleCloseEditProject();
    } catch (err) {
      console.error("Failed to update project:", err);
      setError(String(err));
    }
  };

  const tools = [
    {
      name: "Brillouin Zone Viewer",
      description: "Visualize Brillouin zones in reciprocal space with high-symmetry points",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: "Fermi Surface Viewer",
      description: "Interactive 3D visualization of Fermi surfaces and electronic states",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Band Structure Plotter",
      description: "Plot electronic band structures along high-symmetry k-point paths",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      name: "DOS Plotter",
      description: "Generate density of states plots with customizable energy ranges",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: "SIRIUS FP-LAPW",
      description: "Run an FP-LAPW ground-state calculation and generate bands/DOS",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v4m6.364.636-2.828 2.828M21 12h-4m-.636 6.364-2.828-2.828M12 21v-4m-6.364-.636 2.828-2.828M3 12h4m.636-6.364 2.828 2.828" />
        </svg>
      ),
    },
  ];

  const showDashboard = currentView.type === "dashboard" || currentView.type === "transitioning-to-project" || currentView.type === "transitioning-to-dashboard";
  const showProject = currentView.type === "project" || currentView.type === "transitioning-to-project" || currentView.type === "transitioning-to-dashboard" || currentView.type === "transitioning-to-miniapp" || currentView.type === "transitioning-from-miniapp";
  const showMiniApp = currentView.type === "miniapp" || currentView.type === "transitioning-to-miniapp" || currentView.type === "transitioning-from-miniapp";

  const dashboardExiting = currentView.type === "transitioning-to-project";
  const dashboardEntering = currentView.type === "transitioning-to-dashboard";
  const projectExiting = currentView.type === "transitioning-to-dashboard" || currentView.type === "transitioning-to-miniapp";
  const projectEntering = currentView.type === "transitioning-to-project" || currentView.type === "transitioning-from-miniapp";
  const miniAppExiting = currentView.type === "transitioning-from-miniapp";
  const miniAppEntering = currentView.type === "transitioning-to-miniapp";

  const currentProject = currentView.type !== "dashboard" ? currentView.project : null;
  const currentMiniApp = (currentView.type === "miniapp" || currentView.type === "transitioning-to-miniapp" || currentView.type === "transitioning-from-miniapp") ? currentView.miniApp : null;

  const showBackButton = currentView.type === "project" || currentView.type === "transitioning-to-project" || currentView.type === "transitioning-to-dashboard" || currentView.type === "miniapp" || currentView.type === "transitioning-to-miniapp" || currentView.type === "transitioning-from-miniapp";
  const backButtonEntering = currentView.type === "transitioning-to-project" || currentView.type === "transitioning-to-miniapp";
  const backButtonExiting = currentView.type === "transitioning-to-dashboard" || currentView.type === "transitioning-from-miniapp";

  return (
    <div className="h-screen w-full overflow-hidden relative">
      {/* Static Navigation - unaffected by page transitions */}
      <FloatingLogo />
      <FloatingMenu
        currentProject={currentProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Back Button - shown on project page and mini-app */}
      {showBackButton && (
        <button
          onClick={currentView.type === "miniapp" ? handleBackToProject : handleBackToDashboard}
          className={cn(
            "fixed top-6 left-56 z-50",
            "glass glass-hover rounded-full p-4",
            "flex items-center justify-center",
            "w-14 h-14",
            "transition-opacity duration-400 ease-out",
            backButtonEntering && "opacity-0",
            backButtonExiting && "opacity-0",
            !backButtonEntering && !backButtonExiting && "opacity-100"
          )}
          aria-label="Back to dashboard"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Mini-App Title - shown when in mini-app view */}
      {showMiniApp && currentMiniApp && (
        <h1
          className={cn(
            "fixed top-6 left-[19rem] z-50",
            "text-2xl font-bold text-gray-800 font-kadwa",
            "h-14 flex items-center",
            "transition-opacity duration-400 ease-out",
            miniAppEntering && "opacity-0",
            miniAppExiting && "opacity-0",
            !miniAppEntering && !miniAppExiting && "opacity-100"
          )}
        >
          {currentMiniApp === "band-structure" && "Band Structure"}
          {currentMiniApp === "dos" && "Density of States"}
          {currentMiniApp === "brillouin-zone" && "Brillouin Zone"}
          {currentMiniApp === "fermi-surface" && "Fermi Surface"}
          {currentMiniApp === "sirius" && "SIRIUS Solver"}
        </h1>
      )}

      {/* Dashboard View */}
      {showDashboard && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col transition-all duration-400 ease-out",
            dashboardExiting && "opacity-0 scale-95 pointer-events-none",
            dashboardEntering && "opacity-100 scale-100",
            !dashboardExiting && !dashboardEntering && "opacity-100 scale-100"
          )}
        >
          <main className="flex-1 px-8 pt-32 pb-8 overflow-y-auto overflow-x-hidden">
            <div className="max-w-[1600px] mx-auto space-y-12">
              <section>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 font-kadwa">
                  Projects
                </h2>

                <div className="flex gap-6 overflow-x-auto hide-scrollbar py-16 px-16 -mx-16 -my-16">
                  <div className="flex-shrink-0">
                    <AddMaterialCard
                      onClick={handleOpenNewProject}
                      onMouseEnter={() => setPeekNewProject(true)}
                      onMouseLeave={() => setPeekNewProject(false)}
                    />
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center px-8 text-gray-500">
                      Loading projects...
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center px-8 text-red-500">
                      Error: {error}
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="flex-shrink-0">
                        <MaterialCard
                          name={project.name}
                          formula={project.formula}
                          lastModified={formatRelativeTime(project.updated_at)}
                          isNew={project.id === newlyCreatedId}
                          onClick={() => handleOpenProject(project)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 font-kadwa">
                  Analysis Tools
                </h2>

                <div className="flex gap-6 overflow-x-auto hide-scrollbar py-16 px-16 -mx-16 -my-16">
                  {tools.map((tool, index) => (
                    <div key={index} className="flex-shrink-0">
                      <ToolCard
                        name={tool.name}
                        description={tool.description}
                        icon={tool.icon}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </main>

          {/* New Project Overlay */}
          <div
            className={cn(
              "fixed inset-0 z-50 flex items-end justify-center transition-all duration-300",
              showNewProject
                ? "pointer-events-auto"
                : "pointer-events-none"
            )}
          >
            {/* Dimmed backdrop */}
            <div
              className={cn(
                "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
                showNewProject ? "opacity-100" : "opacity-0"
              )}
              onClick={handleCloseNewProject}
            />

            {/* Card container with slide-up animation */}
            <div
              className={cn(
                "relative mb-8 transition-transform duration-300 ease-out",
                showNewProject
                  ? "translate-y-0"
                  : peekNewProject
                    ? "translate-y-[calc(100%-45px)]"
                    : "translate-y-[calc(100%+2rem)]"
              )}
            >
              <NewProjectCard
                key={newProjectKey}
                onClose={handleCloseNewProject}
                onCreate={handleCreateProject}
              />
            </div>
          </div>
        </div>
      )}

      {/* Project View */}
      {showProject && currentProject && (
        <div
          className={cn(
            "absolute inset-0 transition-all duration-400 ease-out",
            projectEntering && "opacity-0 scale-105",
            projectExiting && "opacity-0 scale-105 pointer-events-none",
            !projectEntering && !projectExiting && "opacity-100 scale-100"
          )}
        >
          <ProjectPage
            project={currentProject}
            onProjectUpdate={handleProjectUpdate}
            onEditProject={handleOpenEditProject}
            onOpenMiniApp={(miniAppId) => handleOpenMiniApp(miniAppId as MiniApp)}
          />
        </div>
      )}

      {/* Mini-App View */}
      {showMiniApp && currentProject && currentMiniApp && (
        <div
          className={cn(
            "absolute inset-0 transition-all duration-400 ease-out",
            miniAppEntering && "opacity-0 scale-105",
            miniAppExiting && "opacity-0 scale-105 pointer-events-none",
            !miniAppEntering && !miniAppExiting && "opacity-100 scale-100"
          )}
        >
          {currentMiniApp === "band-structure" && (
            <BandStructurePage project={currentProject} />
          )}
          {currentMiniApp === "brillouin-zone" && (
            <BrillouinZonePage project={currentProject} />
          )}
          {currentMiniApp === "fermi-surface" && (
            <FermiSurfacePage project={currentProject} />
          )}
          {currentMiniApp === "sirius" && (
            <SiriusSolverPage project={currentProject} />
          )}
        </div>
      )}

      {/* Edit Project Overlay */}
      {currentProject && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-end justify-center transition-all duration-300",
            showEditProject
              ? "pointer-events-auto"
              : "pointer-events-none"
          )}
        >
          {/* Dimmed backdrop */}
          <div
            className={cn(
              "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
              showEditProject ? "opacity-100" : "opacity-0"
            )}
            onClick={handleCloseEditProject}
          />

          {/* Card container with slide-up animation */}
          <div
            className={cn(
              "relative mb-8 transition-transform duration-300 ease-out",
              showEditProject
                ? "translate-y-0"
                : "translate-y-[calc(100%+2rem)]"
            )}
          >
            <NewProjectCard
              key={editProjectKey}
              mode="edit"
              initialName={currentProject.name}
              initialFormula={currentProject.formula}
              onClose={handleCloseEditProject}
              onSave={handleSaveProject}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
