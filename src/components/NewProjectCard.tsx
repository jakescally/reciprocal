import { useState, useEffect, useCallback } from "react";
import { cn } from "../lib/utils";
import {
  elements,
  elementBySymbol,
  categoryColors,
  selectedColors,
  categoryNames,
  type Element,
  type ElementCategory,
} from "../data/periodicTable";

interface SelectedElement {
  element: Element;
  count: number;
}

interface NewProjectCardProps {
  onClose: () => void;
  onCreate: (name: string, formula: string) => void;
}

// Parse formula string into selected elements
// Supports formats like "AgCoO2", "Ag Co O2", "Ag2O3"
function parseFormula(formula: string): SelectedElement[] {
  const result: SelectedElement[] = [];
  const seen = new Map<string, number>();

  // Normalize: remove extra spaces, handle both formats
  const normalized = formula.trim();
  if (!normalized) return [];

  // Regex to match element symbols (1-2 letters, first uppercase) followed by optional number
  const regex = /([A-Z][a-z]?)(\d*)/g;
  let match;

  while ((match = regex.exec(normalized)) !== null) {
    const symbol = match[1];
    const count = match[2] ? parseInt(match[2], 10) : 1;
    const element = elementBySymbol.get(symbol);

    if (element) {
      const existingIndex = seen.get(symbol);
      if (existingIndex !== undefined) {
        result[existingIndex].count += count;
      } else {
        seen.set(symbol, result.length);
        result.push({ element, count });
      }
    }
  }

  return result;
}

// Convert selected elements to formula string
function toFormulaString(selected: SelectedElement[]): string {
  return selected
    .map((s) => `${s.element.symbol}${s.count > 1 ? s.count : ""}`)
    .join("");
}

// Convert to display formula with subscripts
function toDisplayFormula(selected: SelectedElement[]): string {
  return selected
    .map((s) => {
      if (s.count > 1) {
        return `${s.element.symbol}<sub>${s.count}</sub>`;
      }
      return s.element.symbol;
    })
    .join("");
}

export function NewProjectCard({ onClose, onCreate }: NewProjectCardProps) {
  const [projectName, setProjectName] = useState("");
  const [formulaInput, setFormulaInput] = useState("");
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>(
    []
  );
  const [isUpdatingFromInput, setIsUpdatingFromInput] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<ElementCategory | null>(null);

  // Sync from formula input to selected elements
  useEffect(() => {
    if (isUpdatingFromInput) {
      const parsed = parseFormula(formulaInput);
      setSelectedElements(parsed);
    }
  }, [formulaInput, isUpdatingFromInput]);

  // Handle formula input change
  const handleFormulaChange = (value: string) => {
    setIsUpdatingFromInput(true);
    setFormulaInput(value);
    // Reset flag after a short delay
    setTimeout(() => setIsUpdatingFromInput(false), 100);
  };

  // Handle element click on periodic table
  const handleElementClick = useCallback((element: Element) => {
    setIsUpdatingFromInput(false);
    setSelectedElements((prev) => {
      const existing = prev.find((s) => s.element.symbol === element.symbol);
      if (existing) {
        // Deselect (remove) the element
        const updated = prev.filter((s) => s.element.symbol !== element.symbol);
        setFormulaInput(toFormulaString(updated));
        return updated;
      } else {
        // Add new element
        const updated = [...prev, { element, count: 1 }];
        setFormulaInput(toFormulaString(updated));
        return updated;
      }
    });
  }, []);

  // Handle count change in selected elements tray
  const handleCountChange = useCallback(
    (symbol: string, delta: number) => {
      setIsUpdatingFromInput(false);
      setSelectedElements((prev) => {
        const updated = prev
          .map((s) => {
            if (s.element.symbol === symbol) {
              const newCount = s.count + delta;
              return newCount > 0 ? { ...s, count: newCount } : null;
            }
            return s;
          })
          .filter((s): s is SelectedElement => s !== null);
        setFormulaInput(toFormulaString(updated));
        return updated;
      });
    },
    []
  );

  // Remove element from selection
  const handleRemoveElement = useCallback((symbol: string) => {
    setIsUpdatingFromInput(false);
    setSelectedElements((prev) => {
      const updated = prev.filter((s) => s.element.symbol !== symbol);
      setFormulaInput(toFormulaString(updated));
      return updated;
    });
  }, []);

  // Check if an element is selected
  const isSelected = useCallback(
    (symbol: string) => selectedElements.some((s) => s.element.symbol === symbol),
    [selectedElements]
  );

  // Get count for an element
  const getCount = useCallback(
    (symbol: string) => {
      const found = selectedElements.find((s) => s.element.symbol === symbol);
      return found?.count || 0;
    },
    [selectedElements]
  );

  // Handle create
  const handleCreate = () => {
    if (projectName.trim() && selectedElements.length > 0) {
      onCreate(projectName.trim(), toDisplayFormula(selectedElements));
    }
  };

  // Group elements by row for rendering
  const mainTableElements = elements.filter((el) => el.row <= 7);
  const lanthanides = elements.filter((el) => el.row === 8);
  const actinides = elements.filter((el) => el.row === 9);

  return (
    <div className="glass rounded-3xl w-[95vw] max-w-[1100px] max-h-[90vh] overflow-hidden">
      <div className="p-8 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 font-kadwa">
          New Project
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-200/50 hover:bg-gray-300/50 flex items-center justify-center transition-colors"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Project Name Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g., Silver Cobaltate"
          className="w-full px-4 py-3 rounded-xl bg-white/30 backdrop-blur-md border border-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Formula Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chemical Formula
        </label>
        <div className="flex gap-4 items-stretch">
          <input
            type="text"
            value={formulaInput}
            onChange={(e) => handleFormulaChange(e.target.value)}
            placeholder="e.g., AgCoO2"
            className="flex-1 px-4 py-3 rounded-xl bg-white/30 backdrop-blur-md border border-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
          <div className={cn(
            "px-4 rounded-xl bg-white/30 backdrop-blur-md border border-white/40 flex items-center min-w-[80px] transition-opacity",
            selectedElements.length > 0 ? "opacity-100" : "opacity-0"
          )}>
            <span
              className="text-lg text-gray-800"
              dangerouslySetInnerHTML={{
                __html: selectedElements.length > 0 ? toDisplayFormula(selectedElements) : "\u00A0",
              }}
            />
          </div>
        </div>
      </div>

      {/* Periodic Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Periodic Table
          </label>
          <span className={cn(
            "text-sm bg-white/25 backdrop-blur-md px-3 py-1 rounded-full min-w-[140px] text-center transition-opacity",
            hoveredCategory ? "text-gray-600 opacity-100" : "opacity-0"
          )}>
            {hoveredCategory ? categoryNames[hoveredCategory] : "\u00A0"}
          </span>
        </div>
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 overflow-x-auto">
          {/* Main table grid */}
          <div
            className="grid gap-[2px] mb-4"
            style={{
              gridTemplateColumns: "repeat(18, minmax(0, 1fr))",
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
            }}
          >
            {Array.from({ length: 7 * 18 }).map((_, idx) => {
              const row = Math.floor(idx / 18) + 1;
              const col = (idx % 18) + 1;
              const element = mainTableElements.find(
                (el) => el.row === row && el.col === col
              );

              // Dead area (rows 1-3, columns 3-12) - use for selected elements
              if (row <= 3 && col >= 3 && col <= 12) {
                // First row of dead area: render chips spanning multiple columns
                if (row === 1 && col === 3) {
                  // Render all selected element chips in a flex container
                  return (
                    <div
                      key={idx}
                      className="col-span-10 row-span-3 flex flex-wrap content-start gap-2 p-2"
                      style={{ gridColumn: "3 / 13", gridRow: "1 / 4" }}
                    >
                      {selectedElements.map((sel) => (
                        <div
                          key={sel.element.symbol}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all h-fit",
                            selectedColors[sel.element.category]
                          )}
                        >
                          <span className="font-semibold text-sm">{sel.element.symbol}</span>
                          <button
                            onClick={() => handleCountChange(sel.element.symbol, -1)}
                            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                          >
                            <span className="text-sm font-bold">−</span>
                          </button>
                          <span className="w-5 text-center text-sm">{sel.count}</span>
                          <button
                            onClick={() => handleCountChange(sel.element.symbol, 1)}
                            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                          >
                            <span className="text-sm font-bold">+</span>
                          </button>
                          <button
                            onClick={() => handleRemoveElement(sel.element.symbol)}
                            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors ml-1"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                }
                // Skip other cells in the dead area (they're covered by the span)
                return null;
              }

              // Placeholder for lanthanide/actinide markers
              if (row === 6 && col === 3) {
                return (
                  <div
                    key={idx}
                    className="aspect-square flex items-center justify-center text-[8px] text-pink-600 font-medium"
                  >
                    57-71
                  </div>
                );
              }
              if (row === 7 && col === 3) {
                return (
                  <div
                    key={idx}
                    className="aspect-square flex items-center justify-center text-[8px] text-rose-600 font-medium"
                  >
                    89-103
                  </div>
                );
              }

              if (!element) {
                return <div key={idx} className="aspect-square" />;
              }

              const selected = isSelected(element.symbol);
              const count = getCount(element.symbol);

              return (
                <button
                  key={element.symbol}
                  onClick={() => handleElementClick(element)}
                  onMouseEnter={() => setHoveredCategory(element.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  title={`${element.name} (${element.atomicNumber})`}
                  className={cn(
                    "aspect-square rounded border flex flex-col items-center justify-center transition-all leading-none relative",
                    selected
                      ? selectedColors[element.category]
                      : categoryColors[element.category],
                    "hover:scale-110 hover:z-10 active:scale-95"
                  )}
                >
                  <span className="absolute top-0 left-1 text-[11px] opacity-75">{element.atomicNumber}</span>
                  <span className="font-bold text-xl">{element.symbol}</span>
                  {selected && count > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-gray-800 rounded-full text-[8px] font-bold flex items-center justify-center shadow-sm">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Lanthanides */}
          <div className="flex gap-[2px] mb-1 ml-[calc((2/18)*100%+2px)]">
            {lanthanides.map((element) => {
              const selected = isSelected(element.symbol);
              const count = getCount(element.symbol);
              return (
                <button
                  key={element.symbol}
                  onClick={() => handleElementClick(element)}
                  onMouseEnter={() => setHoveredCategory(element.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  title={`${element.name} (${element.atomicNumber})`}
                  className={cn(
                    "w-[calc((100%-30px)/15)] aspect-square rounded border flex flex-col items-center justify-center transition-all leading-none relative",
                    selected
                      ? selectedColors[element.category]
                      : categoryColors[element.category],
                    "hover:scale-110 hover:z-10 active:scale-95"
                  )}
                >
                  <span className="absolute top-0 left-1 text-[11px] opacity-75">{element.atomicNumber}</span>
                  <span className="font-bold text-xl">{element.symbol}</span>
                  {selected && count > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-gray-800 rounded-full text-[8px] font-bold flex items-center justify-center shadow-sm">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actinides */}
          <div className="flex gap-[2px] ml-[calc((2/18)*100%+2px)]">
            {actinides.map((element) => {
              const selected = isSelected(element.symbol);
              const count = getCount(element.symbol);
              return (
                <button
                  key={element.symbol}
                  onClick={() => handleElementClick(element)}
                  onMouseEnter={() => setHoveredCategory(element.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  title={`${element.name} (${element.atomicNumber})`}
                  className={cn(
                    "w-[calc((100%-30px)/15)] aspect-square rounded border flex flex-col items-center justify-center transition-all leading-none relative",
                    selected
                      ? selectedColors[element.category]
                      : categoryColors[element.category],
                    "hover:scale-110 hover:z-10 active:scale-95"
                  )}
                >
                  <span className="absolute top-0 left-1 text-[11px] opacity-75">{element.atomicNumber}</span>
                  <span className="font-bold text-xl">{element.symbol}</span>
                  {selected && count > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-gray-800 rounded-full text-[8px] font-bold flex items-center justify-center shadow-sm">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-xl bg-gray-200/50 hover:bg-gray-300/50 text-gray-700 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!projectName.trim() || selectedElements.length === 0}
          className={cn(
            "px-6 py-3 rounded-xl font-medium transition-all",
            projectName.trim() && selectedElements.length > 0
              ? "bg-primary text-white hover:bg-primary/90 active:scale-95"
              : "bg-gray-400/40 text-gray-600 cursor-not-allowed"
          )}
        >
          Create Project
        </button>
      </div>
      </div>
    </div>
  );
}
