export interface Element {
  atomicNumber: number;
  symbol: string;
  name: string;
  category: ElementCategory;
  row: number;
  col: number;
}

export type ElementCategory =
  | "alkali-metal"
  | "alkaline-earth"
  | "transition-metal"
  | "post-transition-metal"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble-gas"
  | "lanthanide"
  | "actinide";

export const categoryColors: Record<ElementCategory, string> = {
  "alkali-metal": "bg-red-200 hover:bg-red-300 border-red-300",
  "alkaline-earth": "bg-orange-200 hover:bg-orange-300 border-orange-300",
  "transition-metal": "bg-yellow-200 hover:bg-yellow-300 border-yellow-300",
  "post-transition-metal": "bg-green-200 hover:bg-green-300 border-green-300",
  "metalloid": "bg-teal-200 hover:bg-teal-300 border-teal-300",
  "nonmetal": "bg-sky-200 hover:bg-sky-300 border-sky-300",
  "halogen": "bg-blue-200 hover:bg-blue-300 border-blue-300",
  "noble-gas": "bg-purple-200 hover:bg-purple-300 border-purple-300",
  "lanthanide": "bg-pink-200 hover:bg-pink-300 border-pink-300",
  "actinide": "bg-rose-200 hover:bg-rose-300 border-rose-300",
};

export const categoryNames: Record<ElementCategory, string> = {
  "alkali-metal": "Alkali Metal",
  "alkaline-earth": "Alkaline Earth Metal",
  "transition-metal": "Transition Metal",
  "post-transition-metal": "Post-Transition Metal",
  "metalloid": "Metalloid",
  "nonmetal": "Nonmetal",
  "halogen": "Halogen",
  "noble-gas": "Noble Gas",
  "lanthanide": "Lanthanide",
  "actinide": "Actinide",
};

export const selectedColors: Record<ElementCategory, string> = {
  "alkali-metal": "bg-red-500 border-red-600 text-white",
  "alkaline-earth": "bg-orange-500 border-orange-600 text-white",
  "transition-metal": "bg-yellow-500 border-yellow-600 text-white",
  "post-transition-metal": "bg-green-500 border-green-600 text-white",
  "metalloid": "bg-teal-500 border-teal-600 text-white",
  "nonmetal": "bg-sky-500 border-sky-600 text-white",
  "halogen": "bg-blue-500 border-blue-600 text-white",
  "noble-gas": "bg-purple-500 border-purple-600 text-white",
  "lanthanide": "bg-pink-500 border-pink-600 text-white",
  "actinide": "bg-rose-500 border-rose-600 text-white",
};

// Standard periodic table layout
// Rows 1-7 are main table, rows 8-9 are lanthanides/actinides
export const elements: Element[] = [
  // Row 1
  { atomicNumber: 1, symbol: "H", name: "Hydrogen", category: "nonmetal", row: 1, col: 1 },
  { atomicNumber: 2, symbol: "He", name: "Helium", category: "noble-gas", row: 1, col: 18 },

  // Row 2
  { atomicNumber: 3, symbol: "Li", name: "Lithium", category: "alkali-metal", row: 2, col: 1 },
  { atomicNumber: 4, symbol: "Be", name: "Beryllium", category: "alkaline-earth", row: 2, col: 2 },
  { atomicNumber: 5, symbol: "B", name: "Boron", category: "metalloid", row: 2, col: 13 },
  { atomicNumber: 6, symbol: "C", name: "Carbon", category: "nonmetal", row: 2, col: 14 },
  { atomicNumber: 7, symbol: "N", name: "Nitrogen", category: "nonmetal", row: 2, col: 15 },
  { atomicNumber: 8, symbol: "O", name: "Oxygen", category: "nonmetal", row: 2, col: 16 },
  { atomicNumber: 9, symbol: "F", name: "Fluorine", category: "halogen", row: 2, col: 17 },
  { atomicNumber: 10, symbol: "Ne", name: "Neon", category: "noble-gas", row: 2, col: 18 },

  // Row 3
  { atomicNumber: 11, symbol: "Na", name: "Sodium", category: "alkali-metal", row: 3, col: 1 },
  { atomicNumber: 12, symbol: "Mg", name: "Magnesium", category: "alkaline-earth", row: 3, col: 2 },
  { atomicNumber: 13, symbol: "Al", name: "Aluminum", category: "post-transition-metal", row: 3, col: 13 },
  { atomicNumber: 14, symbol: "Si", name: "Silicon", category: "metalloid", row: 3, col: 14 },
  { atomicNumber: 15, symbol: "P", name: "Phosphorus", category: "nonmetal", row: 3, col: 15 },
  { atomicNumber: 16, symbol: "S", name: "Sulfur", category: "nonmetal", row: 3, col: 16 },
  { atomicNumber: 17, symbol: "Cl", name: "Chlorine", category: "halogen", row: 3, col: 17 },
  { atomicNumber: 18, symbol: "Ar", name: "Argon", category: "noble-gas", row: 3, col: 18 },

  // Row 4
  { atomicNumber: 19, symbol: "K", name: "Potassium", category: "alkali-metal", row: 4, col: 1 },
  { atomicNumber: 20, symbol: "Ca", name: "Calcium", category: "alkaline-earth", row: 4, col: 2 },
  { atomicNumber: 21, symbol: "Sc", name: "Scandium", category: "transition-metal", row: 4, col: 3 },
  { atomicNumber: 22, symbol: "Ti", name: "Titanium", category: "transition-metal", row: 4, col: 4 },
  { atomicNumber: 23, symbol: "V", name: "Vanadium", category: "transition-metal", row: 4, col: 5 },
  { atomicNumber: 24, symbol: "Cr", name: "Chromium", category: "transition-metal", row: 4, col: 6 },
  { atomicNumber: 25, symbol: "Mn", name: "Manganese", category: "transition-metal", row: 4, col: 7 },
  { atomicNumber: 26, symbol: "Fe", name: "Iron", category: "transition-metal", row: 4, col: 8 },
  { atomicNumber: 27, symbol: "Co", name: "Cobalt", category: "transition-metal", row: 4, col: 9 },
  { atomicNumber: 28, symbol: "Ni", name: "Nickel", category: "transition-metal", row: 4, col: 10 },
  { atomicNumber: 29, symbol: "Cu", name: "Copper", category: "transition-metal", row: 4, col: 11 },
  { atomicNumber: 30, symbol: "Zn", name: "Zinc", category: "transition-metal", row: 4, col: 12 },
  { atomicNumber: 31, symbol: "Ga", name: "Gallium", category: "post-transition-metal", row: 4, col: 13 },
  { atomicNumber: 32, symbol: "Ge", name: "Germanium", category: "metalloid", row: 4, col: 14 },
  { atomicNumber: 33, symbol: "As", name: "Arsenic", category: "metalloid", row: 4, col: 15 },
  { atomicNumber: 34, symbol: "Se", name: "Selenium", category: "nonmetal", row: 4, col: 16 },
  { atomicNumber: 35, symbol: "Br", name: "Bromine", category: "halogen", row: 4, col: 17 },
  { atomicNumber: 36, symbol: "Kr", name: "Krypton", category: "noble-gas", row: 4, col: 18 },

  // Row 5
  { atomicNumber: 37, symbol: "Rb", name: "Rubidium", category: "alkali-metal", row: 5, col: 1 },
  { atomicNumber: 38, symbol: "Sr", name: "Strontium", category: "alkaline-earth", row: 5, col: 2 },
  { atomicNumber: 39, symbol: "Y", name: "Yttrium", category: "transition-metal", row: 5, col: 3 },
  { atomicNumber: 40, symbol: "Zr", name: "Zirconium", category: "transition-metal", row: 5, col: 4 },
  { atomicNumber: 41, symbol: "Nb", name: "Niobium", category: "transition-metal", row: 5, col: 5 },
  { atomicNumber: 42, symbol: "Mo", name: "Molybdenum", category: "transition-metal", row: 5, col: 6 },
  { atomicNumber: 43, symbol: "Tc", name: "Technetium", category: "transition-metal", row: 5, col: 7 },
  { atomicNumber: 44, symbol: "Ru", name: "Ruthenium", category: "transition-metal", row: 5, col: 8 },
  { atomicNumber: 45, symbol: "Rh", name: "Rhodium", category: "transition-metal", row: 5, col: 9 },
  { atomicNumber: 46, symbol: "Pd", name: "Palladium", category: "transition-metal", row: 5, col: 10 },
  { atomicNumber: 47, symbol: "Ag", name: "Silver", category: "transition-metal", row: 5, col: 11 },
  { atomicNumber: 48, symbol: "Cd", name: "Cadmium", category: "transition-metal", row: 5, col: 12 },
  { atomicNumber: 49, symbol: "In", name: "Indium", category: "post-transition-metal", row: 5, col: 13 },
  { atomicNumber: 50, symbol: "Sn", name: "Tin", category: "post-transition-metal", row: 5, col: 14 },
  { atomicNumber: 51, symbol: "Sb", name: "Antimony", category: "metalloid", row: 5, col: 15 },
  { atomicNumber: 52, symbol: "Te", name: "Tellurium", category: "metalloid", row: 5, col: 16 },
  { atomicNumber: 53, symbol: "I", name: "Iodine", category: "halogen", row: 5, col: 17 },
  { atomicNumber: 54, symbol: "Xe", name: "Xenon", category: "noble-gas", row: 5, col: 18 },

  // Row 6
  { atomicNumber: 55, symbol: "Cs", name: "Cesium", category: "alkali-metal", row: 6, col: 1 },
  { atomicNumber: 56, symbol: "Ba", name: "Barium", category: "alkaline-earth", row: 6, col: 2 },
  // La-Lu go to lanthanide row (row 8)
  { atomicNumber: 72, symbol: "Hf", name: "Hafnium", category: "transition-metal", row: 6, col: 4 },
  { atomicNumber: 73, symbol: "Ta", name: "Tantalum", category: "transition-metal", row: 6, col: 5 },
  { atomicNumber: 74, symbol: "W", name: "Tungsten", category: "transition-metal", row: 6, col: 6 },
  { atomicNumber: 75, symbol: "Re", name: "Rhenium", category: "transition-metal", row: 6, col: 7 },
  { atomicNumber: 76, symbol: "Os", name: "Osmium", category: "transition-metal", row: 6, col: 8 },
  { atomicNumber: 77, symbol: "Ir", name: "Iridium", category: "transition-metal", row: 6, col: 9 },
  { atomicNumber: 78, symbol: "Pt", name: "Platinum", category: "transition-metal", row: 6, col: 10 },
  { atomicNumber: 79, symbol: "Au", name: "Gold", category: "transition-metal", row: 6, col: 11 },
  { atomicNumber: 80, symbol: "Hg", name: "Mercury", category: "transition-metal", row: 6, col: 12 },
  { atomicNumber: 81, symbol: "Tl", name: "Thallium", category: "post-transition-metal", row: 6, col: 13 },
  { atomicNumber: 82, symbol: "Pb", name: "Lead", category: "post-transition-metal", row: 6, col: 14 },
  { atomicNumber: 83, symbol: "Bi", name: "Bismuth", category: "post-transition-metal", row: 6, col: 15 },
  { atomicNumber: 84, symbol: "Po", name: "Polonium", category: "metalloid", row: 6, col: 16 },
  { atomicNumber: 85, symbol: "At", name: "Astatine", category: "halogen", row: 6, col: 17 },
  { atomicNumber: 86, symbol: "Rn", name: "Radon", category: "noble-gas", row: 6, col: 18 },

  // Row 7
  { atomicNumber: 87, symbol: "Fr", name: "Francium", category: "alkali-metal", row: 7, col: 1 },
  { atomicNumber: 88, symbol: "Ra", name: "Radium", category: "alkaline-earth", row: 7, col: 2 },
  // Ac-Lr go to actinide row (row 9)
  { atomicNumber: 104, symbol: "Rf", name: "Rutherfordium", category: "transition-metal", row: 7, col: 4 },
  { atomicNumber: 105, symbol: "Db", name: "Dubnium", category: "transition-metal", row: 7, col: 5 },
  { atomicNumber: 106, symbol: "Sg", name: "Seaborgium", category: "transition-metal", row: 7, col: 6 },
  { atomicNumber: 107, symbol: "Bh", name: "Bohrium", category: "transition-metal", row: 7, col: 7 },
  { atomicNumber: 108, symbol: "Hs", name: "Hassium", category: "transition-metal", row: 7, col: 8 },
  { atomicNumber: 109, symbol: "Mt", name: "Meitnerium", category: "transition-metal", row: 7, col: 9 },
  { atomicNumber: 110, symbol: "Ds", name: "Darmstadtium", category: "transition-metal", row: 7, col: 10 },
  { atomicNumber: 111, symbol: "Rg", name: "Roentgenium", category: "transition-metal", row: 7, col: 11 },
  { atomicNumber: 112, symbol: "Cn", name: "Copernicium", category: "transition-metal", row: 7, col: 12 },
  { atomicNumber: 113, symbol: "Nh", name: "Nihonium", category: "post-transition-metal", row: 7, col: 13 },
  { atomicNumber: 114, symbol: "Fl", name: "Flerovium", category: "post-transition-metal", row: 7, col: 14 },
  { atomicNumber: 115, symbol: "Mc", name: "Moscovium", category: "post-transition-metal", row: 7, col: 15 },
  { atomicNumber: 116, symbol: "Lv", name: "Livermorium", category: "post-transition-metal", row: 7, col: 16 },
  { atomicNumber: 117, symbol: "Ts", name: "Tennessine", category: "halogen", row: 7, col: 17 },
  { atomicNumber: 118, symbol: "Og", name: "Oganesson", category: "noble-gas", row: 7, col: 18 },

  // Lanthanides (Row 8, displayed below main table)
  { atomicNumber: 57, symbol: "La", name: "Lanthanum", category: "lanthanide", row: 8, col: 3 },
  { atomicNumber: 58, symbol: "Ce", name: "Cerium", category: "lanthanide", row: 8, col: 4 },
  { atomicNumber: 59, symbol: "Pr", name: "Praseodymium", category: "lanthanide", row: 8, col: 5 },
  { atomicNumber: 60, symbol: "Nd", name: "Neodymium", category: "lanthanide", row: 8, col: 6 },
  { atomicNumber: 61, symbol: "Pm", name: "Promethium", category: "lanthanide", row: 8, col: 7 },
  { atomicNumber: 62, symbol: "Sm", name: "Samarium", category: "lanthanide", row: 8, col: 8 },
  { atomicNumber: 63, symbol: "Eu", name: "Europium", category: "lanthanide", row: 8, col: 9 },
  { atomicNumber: 64, symbol: "Gd", name: "Gadolinium", category: "lanthanide", row: 8, col: 10 },
  { atomicNumber: 65, symbol: "Tb", name: "Terbium", category: "lanthanide", row: 8, col: 11 },
  { atomicNumber: 66, symbol: "Dy", name: "Dysprosium", category: "lanthanide", row: 8, col: 12 },
  { atomicNumber: 67, symbol: "Ho", name: "Holmium", category: "lanthanide", row: 8, col: 13 },
  { atomicNumber: 68, symbol: "Er", name: "Erbium", category: "lanthanide", row: 8, col: 14 },
  { atomicNumber: 69, symbol: "Tm", name: "Thulium", category: "lanthanide", row: 8, col: 15 },
  { atomicNumber: 70, symbol: "Yb", name: "Ytterbium", category: "lanthanide", row: 8, col: 16 },
  { atomicNumber: 71, symbol: "Lu", name: "Lutetium", category: "lanthanide", row: 8, col: 17 },

  // Actinides (Row 9, displayed below lanthanides)
  { atomicNumber: 89, symbol: "Ac", name: "Actinium", category: "actinide", row: 9, col: 3 },
  { atomicNumber: 90, symbol: "Th", name: "Thorium", category: "actinide", row: 9, col: 4 },
  { atomicNumber: 91, symbol: "Pa", name: "Protactinium", category: "actinide", row: 9, col: 5 },
  { atomicNumber: 92, symbol: "U", name: "Uranium", category: "actinide", row: 9, col: 6 },
  { atomicNumber: 93, symbol: "Np", name: "Neptunium", category: "actinide", row: 9, col: 7 },
  { atomicNumber: 94, symbol: "Pu", name: "Plutonium", category: "actinide", row: 9, col: 8 },
  { atomicNumber: 95, symbol: "Am", name: "Americium", category: "actinide", row: 9, col: 9 },
  { atomicNumber: 96, symbol: "Cm", name: "Curium", category: "actinide", row: 9, col: 10 },
  { atomicNumber: 97, symbol: "Bk", name: "Berkelium", category: "actinide", row: 9, col: 11 },
  { atomicNumber: 98, symbol: "Cf", name: "Californium", category: "actinide", row: 9, col: 12 },
  { atomicNumber: 99, symbol: "Es", name: "Einsteinium", category: "actinide", row: 9, col: 13 },
  { atomicNumber: 100, symbol: "Fm", name: "Fermium", category: "actinide", row: 9, col: 14 },
  { atomicNumber: 101, symbol: "Md", name: "Mendelevium", category: "actinide", row: 9, col: 15 },
  { atomicNumber: 102, symbol: "No", name: "Nobelium", category: "actinide", row: 9, col: 16 },
  { atomicNumber: 103, symbol: "Lr", name: "Lawrencium", category: "actinide", row: 9, col: 17 },
];

// Helper to get element by symbol
export const elementBySymbol = new Map(elements.map(el => [el.symbol, el]));

// Helper to get element by atomic number
export const elementByNumber = new Map(elements.map(el => [el.atomicNumber, el]));
