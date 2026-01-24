import { useEffect, useRef, useState, type CSSProperties } from "react";
import { listen } from "@tauri-apps/api/event";
import { cn } from "../lib/utils";
import { Project } from "../lib/projects";
import { startSiriusRun, type SiriusLogEvent, type SiriusStatusEvent } from "../lib/sirius";

type StepId = "overview" | "structure" | "basics" | "spin" | "run" | "results";

const STEPS: Array<{
  id: StepId;
  title: string;
  summary: string;
}> = [
  {
    id: "overview",
    title: "Overview",
    summary: "What SIRIUS will do for this project.",
  },
  {
    id: "structure",
    title: "Structure Review",
    summary: "Confirm the unit cell and basic geometry.",
  },
  {
    id: "basics",
    title: "Calculation Basics",
    summary: "Set k-mesh and accuracy defaults.",
  },
  {
    id: "spin",
    title: "Spin and SOC",
    summary: "Options are visible but not yet enabled.",
  },
  {
    id: "run",
    title: "Run",
    summary: "Launch the external SIRIUS engine.",
  },
  {
    id: "results",
    title: "Results",
    summary: "Bands and DOS will land here.",
  },
];

export function SiriusSolverPage({ project }: { project: Project }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [previousStep, setPreviousStep] = useState<number | null>(null);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [stepDuration, setStepDuration] = useState(220);
  const transitionTimeout = useRef<number | null>(null);
  const runIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [kMesh, setKMesh] = useState("8x8x8");
  const [accuracy, setAccuracy] = useState("standard");
  const [openTip, setOpenTip] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [logs, setLogs] = useState<SiriusLogEvent[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  useEffect(() => {
    if (!headerRef.current || typeof ResizeObserver === "undefined") return;
    const element = headerRef.current;
    const update = () => setHeaderHeight(element.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleDocClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-tip]")) {
        return;
      }
      setOpenTip(null);
    };

    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  useEffect(() => {
    let unlistenLog: (() => void) | null = null;
    let unlistenStatus: (() => void) | null = null;

    listen<SiriusLogEvent>("sirius-log", (event) => {
      if (event.payload.run_id !== runIdRef.current) return;
      setLogs((prev) => [...prev, event.payload]);
    }).then((unlisten) => {
      unlistenLog = unlisten;
    });

    listen<SiriusStatusEvent>("sirius-status", (event) => {
      if (event.payload.run_id !== runIdRef.current) return;
      if (event.payload.status === "completed") {
        setRunStatus("completed");
      } else if (event.payload.status === "failed") {
        setRunStatus("failed");
      } else {
        setRunStatus("running");
      }
    }).then((unlisten) => {
      unlistenStatus = unlisten;
    });

    return () => {
      if (unlistenLog) unlistenLog();
      if (unlistenStatus) unlistenStatus();
    };
  }, []);

  const step = STEPS[currentStep];
  const canGoBack = currentStep > 0;
  const canGoNext = currentStep < STEPS.length - 1;

  const showCifWarning = !project.has_cif;

  const goToStep = (index: number) => {
    if (index === currentStep) return;
    const delta = Math.abs(index - currentStep);
    setDirection(index > currentStep ? "forward" : "backward");
    setStepDuration(delta > 1 ? 140 : 220);
    setPreviousStep(currentStep);
    setCurrentStep(index);
    if (transitionTimeout.current) {
      window.clearTimeout(transitionTimeout.current);
    }
    transitionTimeout.current = window.setTimeout(() => {
      setPreviousStep(null);
    }, delta > 1 ? 140 : 220);
  };

  const handleStartRun = async () => {
    if (!project.has_cif || runStatus === "running") return;
    setRunError(null);
    setLogs([]);
    setRunStatus("running");
    try {
      const id = await startSiriusRun(project.id);
      runIdRef.current = id;
      setRunId(id);
    } catch (error) {
      setRunStatus("failed");
      setRunError(String(error));
    }
  };

  useEffect(() => {
    return () => {
      if (transitionTimeout.current) {
        window.clearTimeout(transitionTimeout.current);
      }
    };
  }, []);

  const renderStep = (stepId: StepId) => {
    switch (stepId) {
      case "overview":
        return (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Guided FP-LAPW setup
                </h3>
                <div className="relative">
                  <button
                    onClick={() => setOpenTip(openTip === "fp-lapw" ? null : "fp-lapw")}
                    className={cn(
                      "w-7 h-7 rounded-full text-xs font-semibold",
                      "glass glass-hover text-gray-600"
                    )}
                    aria-label="What is FP-LAPW?"
                    data-tip
                  >
                    ?
                  </button>
                  {openTip === "fp-lapw" && (
                    <div
                      className="absolute right-0 top-10 z-30 w-72 animate-bubble-pop"
                      style={{ maxWidth: "calc(100vw - 2rem)" }}
                      data-tip
                    >
                      <div className="absolute -top-2 right-2 tooltip-arrow" />
                      <div className="tooltip-bubble rounded-2xl p-4 text-sm text-gray-600">
                        FP-LAPW splits space into atom-centered spheres and an
                        interstitial region. It is accurate but needs good
                        structure data and reasonable basis settings.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                This wizard runs a ground-state FP-LAPW calculation using the
                external SIRIUS engine. We start with a minimal, portable setup
                on macOS and add advanced physics options later.
              </p>
            </div>

            {showCifWarning && (
              <div className="glass rounded-2xl p-5 border border-amber-200 bg-amber-50/50">
                <p className="text-sm text-amber-800">
                  No CIF file detected for this project. Import a CIF before
                  running the calculation.
                </p>
              </div>
            )}

          </div>
        );

      case "structure":
        return (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Structure Summary
              </h3>
              <p className="text-sm text-gray-600">
                {project.name}{" "}
                <span className="text-gray-400">({project.formula})</span>
              </p>
              {showCifWarning ? (
                <p className="text-sm text-amber-700 mt-3">
                  Import a CIF file to preview the unit cell and generate
                  SIRIUS inputs.
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-3">
                  Unit cell preview and muffin-tin spheres will appear here.
                </p>
              )}
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Muffin-tin radius (R_MT)
                </h4>
                <span className="text-xs text-gray-400">Coming soon</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                disabled
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-2">
                We will help you choose radii that avoid overlapping spheres.
              </p>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="h-56 rounded-xl bg-white/40 flex items-center justify-center text-sm text-gray-500">
                3D unit cell + muffin-tin preview placeholder
              </div>
            </div>
          </div>
        );

      case "basics":
        return (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Calculation basics
                </h3>
                <div className="relative">
                  <button
                    onClick={() => setOpenTip(openTip === "kmesh" ? null : "kmesh")}
                    className={cn(
                      "w-7 h-7 rounded-full text-xs font-semibold",
                      "glass glass-hover text-gray-600"
                    )}
                    aria-label="What is a k-point mesh?"
                    data-tip
                  >
                    ?
                  </button>
                  {openTip === "kmesh" && (
                    <div
                      className="absolute right-0 top-10 z-30 w-72 animate-bubble-pop"
                      style={{ maxWidth: "calc(100vw - 2rem)" }}
                      data-tip
                    >
                      <div className="absolute -top-2 right-2 tooltip-arrow" />
                      <div className="tooltip-bubble rounded-2xl p-4 text-sm text-gray-600">
                        K-points sample the Brillouin zone. More points mean
                        better integration accuracy but higher cost.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                K-point mesh
              </label>
              <input
                value={kMesh}
                onChange={(e) => setKMesh(e.target.value)}
                className="w-full rounded-xl px-4 py-2 text-sm border border-gray-200 bg-white/70 outline-none"
                placeholder="8x8x8"
              />
              <p className="text-xs text-gray-500 mt-2">
                Denser meshes improve accuracy but increase runtime.
              </p>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Accuracy preset
                </label>
                <div className="relative">
                  <button
                    onClick={() => setOpenTip(openTip === "accuracy" ? null : "accuracy")}
                    className={cn(
                      "w-7 h-7 rounded-full text-xs font-semibold",
                      "glass glass-hover text-gray-600"
                    )}
                    aria-label="What does accuracy control?"
                    data-tip
                  >
                    ?
                  </button>
                  {openTip === "accuracy" && (
                    <div
                      className="absolute right-0 top-10 z-30 w-72 animate-bubble-pop"
                      style={{ maxWidth: "calc(100vw - 2rem)" }}
                      data-tip
                    >
                      <div className="absolute -top-2 right-2 tooltip-arrow" />
                      <div className="tooltip-bubble rounded-2xl p-4 text-sm text-gray-600">
                        Accuracy controls plane-wave cutoffs and convergence
                        thresholds. Higher accuracy is slower but more reliable.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <select
                value={accuracy}
                onChange={(e) => setAccuracy(e.target.value)}
                className="w-full rounded-xl px-4 py-2 text-sm border border-gray-200 bg-white/70 outline-none"
              >
                <option value="quick">Quick</option>
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Presets set cutoffs and convergence thresholds behind the
                scenes.
              </p>
            </div>
          </div>
        );

      case "spin":
        return (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Spin and magnetism
                </h3>
                <div className="relative">
                  <button
                    onClick={() => setOpenTip(openTip === "spin" ? null : "spin")}
                    className={cn(
                      "w-7 h-7 rounded-full text-xs font-semibold",
                      "glass glass-hover text-gray-600"
                    )}
                    aria-label="Why spin options matter"
                    data-tip
                  >
                    ?
                  </button>
                  {openTip === "spin" && (
                    <div
                      className="absolute right-0 top-10 z-30 w-72 animate-bubble-pop"
                      style={{ maxWidth: "calc(100vw - 2rem)" }}
                      data-tip
                    >
                      <div className="absolute -top-2 right-2 tooltip-arrow" />
                      <div className="tooltip-bubble rounded-2xl p-4 text-sm text-gray-600">
                        Spin polarization and SOC can split bands and change
                        magnetic ordering. We will enable them after the base
                        workflow is stable.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-500">
                  <input type="checkbox" disabled className="w-4 h-4 rounded" />
                  Enable spin polarization
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-500">
                  <input type="checkbox" disabled className="w-4 h-4 rounded" />
                  Initial magnetic moments
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-500">
                  <input type="checkbox" disabled className="w-4 h-4 rounded" />
                  Spin-orbit coupling (SOC)
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                These options are shown for visibility but disabled in the
                initial release.
              </p>
            </div>
          </div>
        );

      case "run":
        return (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Ready to run
              </h3>
              <p className="text-sm text-gray-600">
                We will launch the external SIRIUS engine and stream progress
                here.
              </p>
              <div className="mt-4 text-xs text-gray-500 space-y-1">
                <p>Engine: SIRIUS (external)</p>
                <p>Platform: macOS (initial target)</p>
                <p>K-mesh: {kMesh}</p>
                <p>Accuracy: {accuracy}</p>
                {runId && <p>Run ID: {runId}</p>}
              </div>
            </div>

            <button
              onClick={handleStartRun}
              disabled={!project.has_cif || runStatus === "running"}
              className={cn(
                "w-full rounded-xl py-3 text-sm font-medium transition-all",
                !project.has_cif || runStatus === "running"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              {runStatus === "running" ? "Running..." : "Start Calculation"}
            </button>

            {runError && (
              <div className="glass rounded-2xl p-4 text-sm text-red-600">
                {runError}
              </div>
            )}

            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Run log
                </h4>
                <span className="text-xs text-gray-500">
                  {runStatus === "running" ? "Live" : runStatus}
                </span>
              </div>
              <div className="h-40 overflow-y-auto rounded-xl bg-white/60 px-3 py-2 text-xs text-gray-600 font-mono">
                {logs.length === 0 ? (
                  <div className="text-gray-400">
                    No log output yet.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={`${log.timestamp}-${index}`}>
                      [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case "results":
        return (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Results
              </h3>
              <p className="text-sm text-gray-600">
                Bands and DOS will appear here once the solver is wired in.
              </p>
            </div>
            <div className="glass rounded-2xl p-5 text-sm text-gray-500">
              Placeholder for run history, bandstructure links, and DOS plots.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col">
      <div ref={headerRef} className="fixed inset-x-0 top-0 z-40">
        <div className="pt-28 px-8 pb-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="glass rounded-3xl p-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 font-kadwa">
                    SIRIUS FP-LAPW Wizard
                  </h2>
                  <p className="text-base text-gray-600 mt-2">
                    Step {currentStep + 1} of {STEPS.length}: {step.title}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  External engine integration (macOS first)
                </div>
              </div>

              <div className="mt-6">
                <div
                  className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2"
                  style={
                    {
                      "--steps": STEPS.length,
                      "--gap": "0.5rem",
                      "--index": currentStep,
                    } as CSSProperties
                  }
                >
                  <div
                    className="absolute inset-y-0 rounded-xl wizard-highlight"
                    style={{
                      width: "calc((100% - (var(--steps) - 1) * var(--gap)) / var(--steps))",
                      left: "calc(var(--index) * (100% - (var(--steps) - 1) * var(--gap)) / var(--steps) + var(--index) * var(--gap))",
                    }}
                  />
                  {STEPS.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => goToStep(index)}
                      className={cn(
                        "text-left rounded-xl px-4 py-3 transition-all relative z-10",
                        index === currentStep
                          ? "text-primary"
                          : "bg-white/40 text-gray-600 hover:bg-white/60"
                      )}
                    >
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.summary}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main
        ref={scrollRef}
        className="flex-1 px-8 pb-8 overflow-y-auto"
        style={{ paddingTop: headerHeight ? headerHeight + 16 : 220 }}
      >
        <div className="w-full max-w-none space-y-6">
          <div className="relative w-full overflow-visible min-h-[520px] px-2">
            {previousStep !== null && (
              <div
                className={cn(
                  "absolute inset-0 w-full",
                  direction === "forward"
                    ? "animate-slide-out-left"
                    : "animate-slide-out-right"
                )}
                style={
                  {
                    "--step-duration": `${stepDuration}ms`,
                  } as CSSProperties
                }
              >
                {renderStep(STEPS[previousStep].id)}
              </div>
            )}
            <div
              className={cn(
                previousStep !== null &&
                  (direction === "forward"
                    ? "animate-slide-in-right"
                    : "animate-slide-in-left")
              )}
              style={
                {
                  "--step-duration": `${stepDuration}ms`,
                } as CSSProperties
              }
            >
              <div className="max-w-[1200px] mx-auto">
                {renderStep(step.id)}
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-8 left-8 z-30">
        <button
          onClick={() => goToStep(Math.max(0, currentStep - 1))}
          disabled={!canGoBack}
          className={cn(
            "rounded-full px-5 py-3 text-sm font-medium transition-all",
            canGoBack
              ? "glass glass-hover text-gray-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          Back
        </button>
      </div>
      <div className="fixed bottom-8 right-8 z-30">
        <button
          onClick={() => goToStep(Math.min(STEPS.length - 1, currentStep + 1))}
          disabled={!canGoNext}
          className={cn(
            "rounded-full px-5 py-3 text-sm font-medium transition-all",
            canGoNext
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          )}
        >
          {canGoNext ? "Next" : "Finish"}
        </button>
      </div>
    </div>
  );
}
