import {
  CrystalData,
  LatticeParameter,
  AtomSite,
  AnisotropicParams,
  Citation,
} from "./projects";

/**
 * Parse a CIF value with uncertainty notation like "5.194(1)" or "3.3232(8)"
 * Returns { value: number, uncertainty?: number }
 */
export function parseValueWithUncertainty(valueStr: string): LatticeParameter {
  const trimmed = valueStr.trim();

  // Check for uncertainty in parentheses: "5.194(1)" or "3.3232(8)"
  const match = trimmed.match(/^(-?\d+\.?\d*)\((\d+)\)$/);
  if (match) {
    const value = parseFloat(match[1]);
    const uncertaintyDigits = match[2];

    // Calculate uncertainty based on the position of decimal places
    const decimalMatch = match[1].match(/\.(\d*)$/);
    if (decimalMatch) {
      const decimalPlaces = decimalMatch[1].length;
      const uncertainty =
        parseInt(uncertaintyDigits) * Math.pow(10, -decimalPlaces);
      return { value, uncertainty };
    } else {
      // No decimal places
      return { value, uncertainty: parseInt(uncertaintyDigits) };
    }
  }

  // No uncertainty notation, just a plain number
  const value = parseFloat(trimmed);
  return { value: isNaN(value) ? 0 : value };
}

/**
 * Format a lattice parameter with uncertainty for display
 * e.g., { value: 5.194, uncertainty: 0.001 } -> "5.194(1)"
 */
export function formatWithUncertainty(
  param: LatticeParameter,
  unit?: string
): string {
  if (param.uncertainty === undefined) {
    return unit ? `${param.value} ${unit}` : `${param.value}`;
  }

  // Figure out how many decimal places in the value
  const valueStr = param.value.toString();
  const decimalMatch = valueStr.match(/\.(\d*)$/);
  const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;

  // Convert uncertainty to the digit representation
  const uncertaintyDigit = Math.round(
    param.uncertainty * Math.pow(10, decimalPlaces)
  );

  const result = `${param.value.toFixed(decimalPlaces)}(${uncertaintyDigit})`;
  return unit ? `${result} ${unit}` : result;
}

interface LoopData {
  columns: string[];
  rows: string[][];
}

/**
 * Parse a loop_ section from CIF content
 */
function parseLoop(
  lines: string[],
  startIndex: number
): { loopData: LoopData; endIndex: number } {
  const columns: string[] = [];
  const rows: string[][] = [];
  let i = startIndex;

  // Parse column headers (lines starting with _)
  while (i < lines.length && lines[i].trim().startsWith("_")) {
    columns.push(lines[i].trim());
    i++;
  }

  // Parse data rows
  while (i < lines.length) {
    const line = lines[i].trim();

    // Stop at next loop_, data block, or empty line followed by a tag
    if (
      line === "" ||
      line.startsWith("loop_") ||
      line.startsWith("data_") ||
      line.startsWith("#")
    ) {
      break;
    }

    // Handle lines that start with _ (new tag outside loop)
    if (line.startsWith("_")) {
      break;
    }

    // Parse the row - handle quoted strings and regular values
    const values = parseLoopRow(line, columns.length);
    if (values.length > 0) {
      rows.push(values);
    }
    i++;
  }

  return { loopData: { columns, rows }, endIndex: i };
}

/**
 * Parse a single row of loop data, handling quoted strings
 */
function parseLoopRow(line: string, _expectedColumns: number): string[] {
  const values: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    } else if (char === "'" || char === '"') {
      inQuote = true;
      quoteChar = char;
    } else if (char === " " || char === "\t") {
      if (current) {
        values.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    values.push(current);
  }

  return values;
}

/**
 * Extract a simple value from a CIF line like "_tag value"
 */
function extractValue(
  content: string,
  tag: string
): string | undefined {
  const regex = new RegExp(`^${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.+)$`, "m");
  const match = content.match(regex);
  if (match) {
    let value = match[1].trim();
    // Remove quotes if present
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

/**
 * Extract a multi-line value (semicolon-delimited)
 */
function extractMultilineValue(
  content: string,
  tag: string
): string | undefined {
  const tagIndex = content.indexOf(tag);
  if (tagIndex === -1) return undefined;

  const afterTag = content.slice(tagIndex + tag.length);
  const semiStart = afterTag.indexOf("\n;");
  if (semiStart === -1) return undefined;

  const semiEnd = afterTag.indexOf("\n;", semiStart + 2);
  if (semiEnd === -1) return undefined;

  return afterTag.slice(semiStart + 2, semiEnd).trim();
}

/**
 * Parse atom sites from loop data
 */
function parseAtomSites(loopData: LoopData): AtomSite[] {
  const sites: AtomSite[] = [];

  const labelIdx = loopData.columns.indexOf("_atom_site_label");
  const typeIdx = loopData.columns.indexOf("_atom_site_type_symbol");
  const xIdx = loopData.columns.indexOf("_atom_site_fract_x");
  const yIdx = loopData.columns.indexOf("_atom_site_fract_y");
  const zIdx = loopData.columns.indexOf("_atom_site_fract_z");
  const wyckoffIdx = loopData.columns.indexOf("_atom_site_Wyckoff_symbol");
  const multIdx = loopData.columns.indexOf("_atom_site_symmetry_multiplicity");
  const occIdx = loopData.columns.indexOf("_atom_site_occupancy");

  for (const row of loopData.rows) {
    const site: AtomSite = {
      label: labelIdx >= 0 ? row[labelIdx] : "",
      type_symbol: typeIdx >= 0 ? row[typeIdx] : "",
      fract_x: xIdx >= 0 ? parseValueWithUncertainty(row[xIdx]).value : 0,
      fract_y: yIdx >= 0 ? parseValueWithUncertainty(row[yIdx]).value : 0,
      fract_z: zIdx >= 0 ? parseValueWithUncertainty(row[zIdx]).value : 0,
      occupancy: occIdx >= 0 ? parseFloat(row[occIdx]) || 1 : 1,
    };

    if (wyckoffIdx >= 0 && row[wyckoffIdx]) {
      site.wyckoff_symbol = row[wyckoffIdx];
    }
    if (multIdx >= 0 && row[multIdx]) {
      site.symmetry_multiplicity = parseInt(row[multIdx]);
    }

    sites.push(site);
  }

  return sites;
}

/**
 * Parse symmetry operations from loop data
 */
function parseSymmetryOperations(loopData: LoopData): string[] {
  const ops: string[] = [];
  const opIdx = loopData.columns.indexOf("_space_group_symop_operation_xyz");
  const altOpIdx = loopData.columns.indexOf("_symmetry_equiv_pos_as_xyz");

  const idx = opIdx >= 0 ? opIdx : altOpIdx;
  if (idx < 0) return ops;

  for (const row of loopData.rows) {
    if (row[idx]) {
      ops.push(row[idx].replace(/['"]/g, ""));
    }
  }

  return ops;
}

/**
 * Parse anisotropic displacement parameters from loop data
 */
function parseAnisotropicParams(loopData: LoopData): AnisotropicParams[] {
  const params: AnisotropicParams[] = [];

  const labelIdx = loopData.columns.indexOf("_atom_site_aniso_label");
  const typeIdx = loopData.columns.indexOf("_atom_site_aniso_type_symbol");
  const b11Idx = loopData.columns.indexOf("_atom_site_aniso_beta_11");
  const b22Idx = loopData.columns.indexOf("_atom_site_aniso_beta_22");
  const b33Idx = loopData.columns.indexOf("_atom_site_aniso_beta_33");
  const b12Idx = loopData.columns.indexOf("_atom_site_aniso_beta_12");
  const b13Idx = loopData.columns.indexOf("_atom_site_aniso_beta_13");
  const b23Idx = loopData.columns.indexOf("_atom_site_aniso_beta_23");

  // Also check for U_ij format
  const u11Idx = loopData.columns.indexOf("_atom_site_aniso_U_11");

  // If neither beta nor U format found, return empty
  if (b11Idx < 0 && u11Idx < 0) return params;

  for (const row of loopData.rows) {
    const param: AnisotropicParams = {
      label: labelIdx >= 0 ? row[labelIdx] : "",
      type_symbol: typeIdx >= 0 ? row[typeIdx] : "",
      beta_11:
        b11Idx >= 0 ? parseValueWithUncertainty(row[b11Idx]).value : 0,
      beta_22:
        b22Idx >= 0 ? parseValueWithUncertainty(row[b22Idx]).value : 0,
      beta_33:
        b33Idx >= 0 ? parseValueWithUncertainty(row[b33Idx]).value : 0,
      beta_12:
        b12Idx >= 0 ? parseValueWithUncertainty(row[b12Idx]).value : 0,
      beta_13:
        b13Idx >= 0 ? parseValueWithUncertainty(row[b13Idx]).value : 0,
      beta_23:
        b23Idx >= 0 ? parseValueWithUncertainty(row[b23Idx]).value : 0,
    };
    params.push(param);
  }

  return params;
}

/**
 * Parse citation information from loop data
 */
function parseCitation(content: string, lines: string[]): Citation | undefined {
  const citation: Citation = { authors: [] };

  // Find citation loop for journal info
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "loop_") {
      const { loopData, endIndex } = parseLoop(lines, i + 1);

      // Check for citation journal loop
      if (loopData.columns.includes("_citation_journal_full")) {
        const journalIdx = loopData.columns.indexOf("_citation_journal_full");
        const yearIdx = loopData.columns.indexOf("_citation_year");
        const volIdx = loopData.columns.indexOf("_citation_journal_volume");
        const pageFirstIdx = loopData.columns.indexOf("_citation_page_first");
        const pageLastIdx = loopData.columns.indexOf("_citation_page_last");

        if (loopData.rows.length > 0) {
          const row = loopData.rows[0];
          if (journalIdx >= 0) citation.journal = row[journalIdx];
          if (yearIdx >= 0) citation.year = parseInt(row[yearIdx]);
          if (volIdx >= 0) citation.volume = row[volIdx];
          if (pageFirstIdx >= 0) citation.page_first = row[pageFirstIdx];
          if (pageLastIdx >= 0) citation.page_last = row[pageLastIdx];
        }
      }

      // Check for author loop
      if (loopData.columns.includes("_citation_author_name")) {
        const nameIdx = loopData.columns.indexOf("_citation_author_name");
        for (const row of loopData.rows) {
          if (row[nameIdx]) {
            citation.authors.push(row[nameIdx].replace(/['"]/g, ""));
          }
        }
      }

      i = endIndex - 1;
    }
  }

  // Get title from multiline value
  const title = extractMultilineValue(content, "_citation_title");
  if (title) {
    citation.title = title;
  }

  // Only return citation if we have some data
  if (
    citation.title ||
    citation.journal ||
    citation.authors.length > 0
  ) {
    return citation;
  }

  return undefined;
}

/**
 * Main CIF parser function
 */
export function parseCIF(content: string): CrystalData {
  const lines = content.split("\n");

  // Initialize with default values
  const crystalData: CrystalData = {
    cell_length_a: { value: 0 },
    cell_length_b: { value: 0 },
    cell_length_c: { value: 0 },
    cell_angle_alpha: { value: 90 },
    cell_angle_beta: { value: 90 },
    cell_angle_gamma: { value: 90 },
    atom_sites: [],
    symmetry_operations: [],
    anisotropic_params: [],
  };

  // Extract simple values
  const chemicalName = extractValue(content, "_chemical_name_common");
  if (chemicalName) crystalData.chemical_name_common = chemicalName;

  const formulaStructural = extractValue(content, "_chemical_formula_structural");
  if (formulaStructural) crystalData.formula_structural = formulaStructural;

  const formulaSum = extractValue(content, "_chemical_formula_sum");
  if (formulaSum) crystalData.formula_sum = formulaSum;

  const structureType = extractValue(content, "_chemical_name_structure_type");
  if (structureType) crystalData.structure_type = structureType;

  // Cell parameters
  const cellA = extractValue(content, "_cell_length_a");
  if (cellA) crystalData.cell_length_a = parseValueWithUncertainty(cellA);

  const cellB = extractValue(content, "_cell_length_b");
  if (cellB) crystalData.cell_length_b = parseValueWithUncertainty(cellB);

  const cellC = extractValue(content, "_cell_length_c");
  if (cellC) crystalData.cell_length_c = parseValueWithUncertainty(cellC);

  const alphaVal = extractValue(content, "_cell_angle_alpha");
  if (alphaVal) crystalData.cell_angle_alpha = parseValueWithUncertainty(alphaVal);

  const betaVal = extractValue(content, "_cell_angle_beta");
  if (betaVal) crystalData.cell_angle_beta = parseValueWithUncertainty(betaVal);

  const gammaVal = extractValue(content, "_cell_angle_gamma");
  if (gammaVal) crystalData.cell_angle_gamma = parseValueWithUncertainty(gammaVal);

  const cellVolume = extractValue(content, "_cell_volume");
  if (cellVolume) crystalData.cell_volume = parseFloat(cellVolume);

  const cellZ = extractValue(content, "_cell_formula_units_Z");
  if (cellZ) crystalData.cell_formula_units_Z = parseInt(cellZ);

  // Space group
  const spaceGroupHM =
    extractValue(content, "_space_group_name_H-M_alt") ||
    extractValue(content, "_symmetry_space_group_name_H-M");
  if (spaceGroupHM) crystalData.space_group_HM = spaceGroupHM;

  const spaceGroupIT =
    extractValue(content, "_space_group_IT_number") ||
    extractValue(content, "_symmetry_Int_Tables_number");
  if (spaceGroupIT) crystalData.space_group_IT_number = parseInt(spaceGroupIT);

  // Physical properties
  const density = extractValue(content, "_exptl_crystal_density_diffrn");
  if (density) crystalData.density = parseFloat(density);

  const temp = extractValue(content, "_diffrn_ambient_temperature");
  if (temp) crystalData.measurement_temperature = parseFloat(temp);

  // Source
  const dbCode = extractValue(content, "_database_code_ICSD");
  if (dbCode) crystalData.database_code = dbCode;

  const auditDate = extractValue(content, "_audit_creation_date");
  if (auditDate) crystalData.audit_creation_date = auditDate;

  // Parse loop sections
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "loop_") {
      const { loopData, endIndex } = parseLoop(lines, i + 1);

      // Check what type of loop this is
      if (loopData.columns.includes("_atom_site_label")) {
        crystalData.atom_sites = parseAtomSites(loopData);
      } else if (
        loopData.columns.includes("_space_group_symop_operation_xyz") ||
        loopData.columns.includes("_symmetry_equiv_pos_as_xyz")
      ) {
        crystalData.symmetry_operations = parseSymmetryOperations(loopData);
      } else if (loopData.columns.includes("_atom_site_aniso_label")) {
        crystalData.anisotropic_params = parseAnisotropicParams(loopData);
      }

      i = endIndex - 1;
    }
  }

  // Parse citation
  const citation = parseCitation(content, lines);
  if (citation) crystalData.citation = citation;

  return crystalData;
}
