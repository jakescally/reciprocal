# Reciprocal

A cross-platform desktop application for condensed matter physics research, built with Tauri, React, and Three.js.

## Overview

Reciprocal is a visualization and management platform for working with:
- Band structures
- Fermi surfaces
- Brillouin zones (position and momentum space)
- Material properties and computational results

## Tech Stack

- **Tauri** - Rust-powered desktop framework
- **React** - UI framework
- **Three.js / react-three-fiber** - 3D visualization
- **TypeScript** - Type safety
- **Vite** - Build tool

## Prerequisites

Before running Reciprocal, ensure you have:

1. **Node.js** 20.19+ or 22.12+ (currently you have 20.2.0 - upgrade recommended)
2. **Rust** 1.83+ (currently 1.81.0 - upgrade required)
3. Platform-specific dependencies for Tauri (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

### Upgrading Rust

```bash
rustup update stable
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev
```

## Project Structure

```
reciprocal/
├── src/              # React frontend
│   ├── App.tsx       # Main application component
│   ├── App.css       # Styling
│   └── main.tsx      # React entry point
├── src-tauri/        # Rust backend
│   ├── src/          # Rust source code
│   └── tauri.conf.json  # Tauri configuration
└── public/           # Static assets
```

## Roadmap

Future features to add as needed:
- File import/export for Wien2K, VASP, etc.
- Interactive Brillouin zone visualization
- Band structure plotting
- Fermi surface rendering
- Material database/library
- Calculation result management

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
