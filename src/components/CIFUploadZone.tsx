import { open } from "@tauri-apps/plugin-dialog";
import {
  importCIFFile,
  readCIFFile,
  saveCrystalData,
  CrystalData,
  Project,
} from "../lib/projects";
import { parseCIF } from "../lib/cifParser";

interface CIFUploadZoneProps {
  projectId: string;
  onCIFImported: (project: Project, crystalData: CrystalData) => void;
}

export function CIFUploadZone({ projectId, onCIFImported }: CIFUploadZoneProps) {
  const handleUpload = async () => {
    try {
      // Open file dialog
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "CIF Files",
            extensions: ["cif"],
          },
        ],
      });

      if (!selected) return;

      const filePath = selected as string;
      const filename = filePath.split("/").pop() || "structure.cif";

      // Import the CIF file to the project folder
      const updatedProject = await importCIFFile(projectId, filePath, filename);

      // Read the CIF content
      const cifContent = await readCIFFile(projectId);

      // Parse the CIF content
      const crystalData = parseCIF(cifContent);

      // Save the parsed data
      await saveCrystalData(projectId, crystalData);

      // Notify parent
      onCIFImported(updatedProject, crystalData);
    } catch (error) {
      console.error("Failed to import CIF file:", error);
    }
  };

  return (
    <div
      onClick={handleUpload}
      className="w-full h-full bg-black/90 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-black/80 border-2 border-dashed border-gray-700 hover:border-gray-500"
    >
      {/* Upload Icon */}
      <svg
        className="w-12 h-12 text-gray-500 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <span className="text-gray-400 text-sm font-medium">Upload CIF File</span>
      <span className="text-gray-600 text-xs mt-1">
        Click to select a .cif file
      </span>
    </div>
  );
}
