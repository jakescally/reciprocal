# FLAPW Calculation Feature Plan

## Objective
Create a self-contained, user-friendly interface for running Full-Potential Linear Augmented Plane Wave (FP-LAPW) electronic structure calculations using the SIRIUS library, fully integrated into the Reciprocal platform.

## 1. Architecture: The "Embedded Engine"

We will implement a **Controller-Worker** architecture where the frontend serves as the control center and a bundled Python environment acts as the compute engine.

### A. The Worker (The Physics Engine)
*   **Technology:** Python 3.11+ script (`src-tauri/python/engine.py`).
*   **Libraries:** `sirius` (DFT), `numpy` (math), `scipy` (optimization), `json` (I/O).
*   **Interface:**
    *   **Input:** Accepts a path to a `job_config.json` file via command-line argument.
    *   **Output:** Writes `results.json` and standard band structure formats.
    *   **IPC (Inter-Process Communication):** Prints structured JSON-lines to `stdout` for real-time progress updates (e.g., `{"status": "scf_step", "iteration": 1, "energy": -250.4, "error": 1e-3}`).
*   **Bundling Strategy (The "One App" Solution:
    *   **Tool:** `conda-pack`.
    *   **Process:** We create a dedicated `conda` environment (e.g., `reciprocal-env`) containing `sirius`, `python`, and `openmpi` (if installable via conda).
    *   **Packaging:** We use `conda-pack` to archive this environment into `src-tauri/resources/python_env`.
    *   **Tauri Config:** We update `tauri.conf.json`'s `bundle.resources` to include this directory.
    *   **Runtime:** The Rust backend resolves the path to the bundled python executable at runtime relative to the application binary.
    *   **MPI Handling:** Since MacOS lacks native MPI, we will attempt to rely on the `mpich` package from `conda-forge`, which often includes the necessary shared libraries relative to the environment prefix. If system-level linking issues arise, we will use `install_name_tool` (on Mac) to fix dynamic library paths (RPATH) within the bundled environment during the build process.

### B. The Backend (The Controller)
*   **Technology:** Rust (Tauri Commands).
*   **Responsibility:** Job Lifecycle Management.
*   **Implementation:**
    *   `Command::spawn_calculation`: Receives `Project` data, serializes it to `job_config.json`, and spawns the Python subprocess using `std::process::Command`.
    *   `Event Streaming`: Spawns a thread to read the subprocess's `stdout`. It parses the JSON-lines and emits Tauri Events (`calculation-progress`) to the frontend.
    *   `Command::kill_calculation`: Terminates the subprocess if the user cancels.

### C. The Frontend (The Wizard)
*   **Technology:** React + TypeScript + Three.js (`@react-three/fiber`).
*   **Location:** `src/components/CalculationPage.tsx` (accessible via a new "ToolCard").

## 2. User Experience & Implementation Details

The UI will be a "Stepped Wizard" to guide the user through the physics.

### Step 1: Structure & Muffin-Tins
*   **Goal:** Define the physical partitions of space (Muffin-Tins vs. Interstitial).
*   **UI:** A split view. Left side: Controls. Right side: 3D Visualization.
*   **Technical Implementation:**
    *   **Visuals:** Reuse `UnitCellViewer` but add a new layer: `MuffinTinSpheres`.
        *   These will be `THREE.SphereGeometry` meshes centered at atom positions.
        *   Material: `THREE.MeshPhysicalMaterial` with `transmission: 0.5` (glassy/semi-transparent) and colored by element.
    *   **Logic:**
        *   Implement a `calculate_mt_radii(atoms, lattice)` function in TypeScript.
        *   Algorithm: Find the nearest neighbor distance ($d_{ij}$) for every atom pair. Set $R_i + R_j < d_{ij}$ (usually touching, so $R 
approx d/2$).
        *   Warning System: If user manually increases radii such that spheres overlap, flash the spheres Red in the 3D view and disable the "Next" button.

### Step 2: Physics Parameters
*   **Goal:** Configure the approximation level.
*   **UI:** "Simple" vs "Advanced" tabs.
*   **Controls:**
    *   **Magnetism:** Toggle buttons for "Non-Magnetic", "Ferromagnetic" (Grayed out for V1).
    *   **Functional:** Dropdown for `LDA`, `PBE`, `PBEsol`.
    *   **Precision:** A slider from "Rough" to "Precise".
        *   *Technical Mapping:* "Rough" $\rightarrow$ $R_{MT}K_{max} = 7.0$, K-grid density = 0.2 $\text{\AA}^{-1}$. "Precise" $\rightarrow$ $R_{MT}K_{max} = 8.5$, K-grid = 0.1 $\text{\AA}^{-1}$.
    *   **Education:** Hover tooltips explaining *why* a parameter matters (e.g., "$R_{MT}K_{max}$ controls the number of plane waves. Higher = more accurate but slower.").

### Step 3: The K-Path (Band Structure Setup)
*   **Goal:** Define the path through Reciprocal Space.
*   **UI:** Interactive Brillouin Zone.
*   **Technical Implementation:**
    *   Reuse `BrillouinZoneViewer`.
    *   **Interaction:** Allow clicking on High Symmetry Points (rendered as clickable `THREE.Sprite` or `THREE.Points`).
    *   **State:** Maintain an ordered list of selected points (e.g., `['Γ', 'X', 'W', 'K', 'Γ']`).
    *   **Visual Feedback:** Draw lines (`THREE.Line`) connecting selected points in real-time.

### Step 4: Execution & Feedback
*   **Goal:** Run the job and show progress.
*   **UI:** Dashboard view.
*   **Technical Implementation:**
    *   **Convergence Plot:** A generic `Recharts` LineChart.
        *   X-Axis: Iteration Number.
        *   Y-Axis: Total Energy difference ($\Delta E$).
        *   Updates in real-time via the `calculation-progress` Tauri event.
    *   **Terminal Output (Hidden/Optional):** An expandable "Debug Log" `<pre>` tag that shows raw SIRIUS output if something goes wrong.

### Step 5: Results
*   **Goal:** Transition to analysis.
*   **UI:** Success screen with "Open Band Structure" button.
*   **Technical Implementation:**
    *   The Python script saves `bands.json` (eigenvalues) and `dos.json` (density of states).
    *   Clicking the button navigates to `/project/:id/bands`, passing the path to the newly generated JSON file (bypassing the Wien2k parser).

## 3. Development Roadmap

1.  **Phase 1: The Engine (Python/SIRIUS)**
    *   Write `engine.py` using a local conda environment.
    *   Test it manually with a `config.json` for Silicon.
2.  **Phase 2: The Bridge (Rust/Tauri)**
    *   Implement the `Command::spawn_calculation` in Rust.
    *   Connect the stdout stream to the frontend.
3.  **Phase 3: The Wizard (Frontend)**
    *   Build the `CalculationPage` and the Muffin-Tin visualizer.
4.  **Phase 4: Integration**
    *   Connect the Wizard inputs to the Rust command.
    *   Validate the full loop (Start UI $\rightarrow$ Run Python $\rightarrow$ View Results).
5.  **Phase 5: Packaging (Bundling)**
    *   Use `conda-pack` to create the standalone environment.
    *   Configure Tauri to bundle it.
    *   Test on a "clean" machine (or simulate by deactivating conda).
