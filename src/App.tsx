import { useState, useEffect, useCallback } from "react";
import { FloatingLogo } from "./components/FloatingLogo";
import { FloatingMenu } from "./components/FloatingMenu";
import { MaterialCard, CardRect } from "./components/MaterialCard";
import { AddMaterialCard } from "./components/AddMaterialCard";
import { ToolCard } from "./components/ToolCard";
import { NewProjectCard } from "./components/NewProjectCard";
import { ProjectPage } from "./components/ProjectPage";
import { ProjectTransition } from "./components/ProjectTransition";
import { cn } from "./lib/utils";
import {
  Project,
  loadProjects,
  createProject,
  formatRelativeTime,
} from "./lib/projects";

type View =
  | { type: "dashboard" }
  | { type: "transitioning"; project: Project; startRect: CardRect }
  | { type: "project"; project: Project };

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>({ type: "dashboard" });

  const [showNewProject, setShowNewProject] = useState(false);
  const [peekNewProject, setPeekNewProject] = useState(false);
  const [newProjectKey, setNewProjectKey] = useState(0);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

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

  const handleOpenProject = (project: Project, rect: CardRect) => {
    setCurrentView({ type: "transitioning", project, startRect: rect });
  };

  const handleTransitionComplete = useCallback(() => {
    if (currentView.type === "transitioning") {
      setCurrentView({ type: "project", project: currentView.project });
    }
  }, [currentView]);

  const handleBackToDashboard = () => {
    setCurrentView({ type: "dashboard" });
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
  ];

  // Render project page if a project is selected
  if (currentView.type === "project") {
    return (
      <ProjectPage
        project={currentView.project}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Render dashboard (possibly with transition overlay)
  return (
    <div className="h-screen w-full overflow-hidden flex flex-col">
      <FloatingLogo />
      <FloatingMenu />

      <main className="flex-1 px-8 pt-32 pb-8 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-12">
          <section>
            <h2 className="text-3xl font-bold text-gray-800 mb-6 font-kadwa">
              Projects
            </h2>

            <div className="flex gap-6 overflow-x-auto py-16 px-16 -mx-16 -my-16">
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
                      onClick={(rect) => handleOpenProject(project, rect)}
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

            <div className="flex gap-6 overflow-x-auto py-16 px-16 -mx-16 -my-16">
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

      {/* Project Transition Overlay */}
      {currentView.type === "transitioning" && (
        <ProjectTransition
          project={currentView.project}
          startRect={currentView.startRect}
          onAnimationComplete={handleTransitionComplete}
        />
      )}
    </div>
  );
}

export default App;
