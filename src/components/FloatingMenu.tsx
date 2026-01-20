import { useState } from "react";
import { cn } from "../lib/utils";
import { useTheme, THEME_PRESETS } from "../lib/theme";
import { Project } from "../lib/projects";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  hasSubmenu?: boolean;
  danger?: boolean;
}

function MenuItem({ icon, label, onClick, hasSubmenu, danger }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
        "transition-all duration-200",
        "hover:translate-x-1",
        "active:scale-[0.98]",
        "text-left group",
        danger
          ? "text-red-600 hover:bg-red-50/50 active:bg-red-100/50"
          : "text-gray-700 hover:bg-white/40 active:bg-white/50"
      )}
    >
      <span className={cn(
        "transition-colors",
        danger
          ? "text-red-500 group-hover:text-red-600"
          : "text-gray-600 group-hover:text-primary"
      )}>
        {icon}
      </span>
      <span className="font-medium flex-1">{label}</span>
      {hasSubmenu && (
        <svg
          className={cn(
            "w-4 h-4 transition-colors",
            danger
              ? "text-red-400 group-hover:text-red-500"
              : "text-gray-400 group-hover:text-primary"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </button>
  );
}

interface FloatingMenuProps {
  currentProject?: Project | null;
  onDeleteProject?: () => void;
}

type MenuView = "main" | "ui" | "delete-confirm";

export function FloatingMenu({ currentProject, onDeleteProject }: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("main");

  // Use theme context
  const { themeIndex, setTheme } = useTheme();

  // Local state for pending selection (before Apply is clicked)
  const [pendingTheme, setPendingTheme] = useState(themeIndex);

  const handleToggle = () => {
    if (isOpen) {
      // Closing - reset to main menu
      setIsOpen(false);
      setTimeout(() => setMenuView("main"), 300);
    } else {
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setMenuView("main"), 300);
  };

  const handleOpenUI = () => {
    // Reset pending to current theme when opening UI panel
    setPendingTheme(themeIndex);
    setMenuView("ui");
  };

  const handleBackToMain = () => {
    setMenuView("main");
  };

  // Separate gradient and solid themes
  const gradientThemes = THEME_PRESETS.filter(t => t.type === "gradient");
  const solidThemes = THEME_PRESETS.filter(t => t.type === "solid");

  return (
    <>
      {/* Backdrop - closes menu when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleClose}
        />
      )}

      {/* Menu Button */}
      <button
        onClick={handleToggle}
        className={cn(
          "fixed top-6 right-6 z-50",
          "glass rounded-full p-4",
          "flex items-center justify-center",
          "w-14 h-14",
          "transition-all duration-300",
          "hover:scale-105 active:scale-95",
          isOpen
            ? "bg-white/30 shadow-lg"
            : "hover:bg-white/20"
        )}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-1.5">
          <div
            className={cn(
              "w-5 h-0.5 bg-primary rounded-full transition-all duration-300 origin-center",
              isOpen && "rotate-45 translate-y-2"
            )}
          />
          <div
            className={cn(
              "w-5 h-0.5 bg-primary rounded-full transition-all duration-300",
              isOpen && "opacity-0 scale-0"
            )}
          />
          <div
            className={cn(
              "w-5 h-0.5 bg-primary rounded-full transition-all duration-300 origin-center",
              isOpen && "-rotate-45 -translate-y-2"
            )}
          />
        </div>
      </button>

      {/* Main Menu Panel */}
      <div
        className={cn(
          "fixed top-6 right-24 z-[45]",
          "glass rounded-2xl",
          "w-56 py-2",
          "shadow-lg",
          "transition-all duration-300 ease-out",
          isOpen && menuView === "main"
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-8 pointer-events-none"
        )}
      >
        <div className="px-2">
          <MenuItem
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            }
            label="UI"
            onClick={handleOpenUI}
            hasSubmenu
          />
          <MenuItem
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            label="Settings"
            onClick={() => {
              console.log("Settings clicked");
              handleClose();
            }}
          />

          {/* Project-specific options */}
          {currentProject && (
            <>
              <div className="my-2 mx-2 border-t border-gray-300/30" />
              <MenuItem
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                }
                label="Delete Project"
                onClick={() => setMenuView("delete-confirm")}
                hasSubmenu
                danger
              />
            </>
          )}

          <div className="my-2 mx-2 border-t border-gray-300/30" />

          <MenuItem
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            }
            label="Exit"
            onClick={() => {
              console.log("Exit clicked");
            }}
          />
        </div>
      </div>

      {/* UI Submenu Panel */}
      <div
        className={cn(
          "fixed top-6 right-24 z-[45]",
          "glass rounded-2xl",
          "w-72 py-3",
          "shadow-lg",
          "transition-all duration-300 ease-out",
          isOpen && menuView === "ui"
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-8 pointer-events-none"
        )}
      >
        <div className="px-3">
          {/* Back button header */}
          <button
            onClick={handleBackToMain}
            className={cn(
              "flex items-center gap-2 px-2 py-2 mb-2 rounded-lg w-full",
              "text-gray-600 hover:text-gray-800 hover:bg-white/30",
              "transition-all duration-200 active:scale-[0.98]"
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium text-sm">Theme Presets</span>
          </button>

          <div className="mb-1 border-t border-gray-300/30" />

          {/* Gradient Themes Section */}
          <div className="px-2 py-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Gradients
              <span className="ml-2 text-[10px] text-gray-400 normal-case">(coming soon)</span>
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {gradientThemes.map((theme) => {
                const index = THEME_PRESETS.indexOf(theme);
                const isDisabled = true; // All gradient themes disabled for now
                return (
                  <button
                    key={theme.name}
                    onClick={() => !isDisabled && setPendingTheme(index)}
                    disabled={isDisabled}
                    className={cn(
                      "aspect-square rounded-xl transition-all duration-200",
                      "border-2 relative overflow-hidden",
                      isDisabled
                        ? "opacity-40 grayscale cursor-not-allowed"
                        : "hover:scale-110 hover:z-10 active:scale-95",
                      pendingTheme === index && !isDisabled
                        ? "border-primary shadow-md"
                        : "border-transparent"
                    )}
                    style={{ background: theme.background }}
                    title={isDisabled ? `${theme.name} (coming soon)` : theme.name}
                  >
                    {/* Accent color indicator */}
                    <div
                      className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white/50"
                      style={{ backgroundColor: theme.accent.hex }}
                    />
                    {/* Strikethrough overlay for disabled themes */}
                    {isDisabled && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-gray-500/60 rotate-45" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="my-2 mx-2 border-t border-gray-300/30" />

          {/* Solid Themes Section */}
          <div className="px-2 py-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Solid Colors
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {solidThemes.map((theme) => {
                const index = THEME_PRESETS.indexOf(theme);
                const isDisabled = index !== 0; // Only Classic (index 0) is enabled
                return (
                  <button
                    key={theme.name}
                    onClick={() => !isDisabled && setPendingTheme(index)}
                    disabled={isDisabled}
                    className={cn(
                      "aspect-square rounded-xl transition-all duration-200",
                      "border-2 relative overflow-hidden",
                      isDisabled
                        ? "opacity-40 grayscale cursor-not-allowed"
                        : "hover:scale-110 hover:z-10 active:scale-95",
                      pendingTheme === index && !isDisabled
                        ? "border-primary shadow-md"
                        : "border-transparent",
                      !isDisabled && pendingTheme !== index && "hover:border-white/50"
                    )}
                    style={{ backgroundColor: theme.background }}
                    title={isDisabled ? `${theme.name} (coming soon)` : theme.name}
                  >
                    {/* Accent color indicator */}
                    <div
                      className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white/50"
                      style={{ backgroundColor: theme.accent.hex }}
                    />
                    {/* Strikethrough overlay for disabled themes */}
                    {isDisabled && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-gray-500/60 rotate-45" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="my-2 mx-2 border-t border-gray-300/30" />

          {/* Apply Button */}
          <div className="px-2 py-2">
            <button
              onClick={() => {
                setTheme(pendingTheme);
                handleClose();
              }}
              className={cn(
                "w-full py-2.5 px-4 rounded-xl",
                "bg-primary text-white font-medium",
                "transition-all duration-200",
                "hover:bg-primary/90 hover:shadow-md",
                "active:scale-[0.98]"
              )}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Panel */}
      {currentProject && (
        <div
          className={cn(
            "fixed top-6 right-24 z-[45]",
            "glass rounded-2xl",
            "w-72 py-3",
            "shadow-lg",
            "transition-all duration-300 ease-out",
            isOpen && menuView === "delete-confirm"
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-8 pointer-events-none"
          )}
        >
          <div className="px-3">
            {/* Back button header */}
            <button
              onClick={handleBackToMain}
              className={cn(
                "flex items-center gap-2 px-2 py-2 mb-2 rounded-lg w-full",
                "text-gray-600 hover:text-gray-800 hover:bg-white/30",
                "transition-all duration-200 active:scale-[0.98]"
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="font-medium text-sm">Delete Project</span>
            </button>

            <div className="mb-3 border-t border-gray-300/30" />

            {/* Warning message */}
            <div className="px-2 py-2">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-100">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-medium mb-1">
                    Delete "{currentProject.name}"?
                  </p>
                  <p className="text-xs text-gray-500">
                    This action cannot be undone. All data associated with this project will be permanently deleted.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleBackToMain}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-xl",
                    "bg-white/50 text-gray-700 font-medium",
                    "transition-all duration-200",
                    "hover:bg-white/70",
                    "active:scale-[0.98]"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onDeleteProject) {
                      onDeleteProject();
                    }
                    handleClose();
                  }}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-xl",
                    "bg-red-600 text-white font-medium",
                    "transition-all duration-200",
                    "hover:bg-red-700 hover:shadow-md",
                    "active:scale-[0.98]"
                  )}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
