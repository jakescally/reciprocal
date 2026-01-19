import { AtomSite } from "../lib/projects";

interface AtomSitesTableProps {
  atoms: AtomSite[];
}

export function AtomSitesTable({ atoms }: AtomSitesTableProps) {
  if (atoms.length === 0) {
    return <p className="text-gray-500 text-sm">No atom sites found</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 font-medium text-gray-600">
              Label
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-600">
              Element
            </th>
            <th className="text-right py-2 px-2 font-medium text-gray-600">x</th>
            <th className="text-right py-2 px-2 font-medium text-gray-600">y</th>
            <th className="text-right py-2 px-2 font-medium text-gray-600">z</th>
            <th className="text-center py-2 px-2 font-medium text-gray-600">
              Wyckoff
            </th>
            <th className="text-right py-2 px-2 font-medium text-gray-600">
              Occ
            </th>
          </tr>
        </thead>
        <tbody>
          {atoms.map((atom, index) => (
            <tr
              key={index}
              className="border-b border-gray-100 hover:bg-white/50"
            >
              <td className="py-2 px-2 text-gray-800 font-medium">
                {atom.label}
              </td>
              <td className="py-2 px-2 text-gray-600">
                {atom.type_symbol.replace(/\d+[+-]?$/, "")}
              </td>
              <td className="py-2 px-2 text-right text-gray-700 font-mono">
                {atom.fract_x.toFixed(5)}
              </td>
              <td className="py-2 px-2 text-right text-gray-700 font-mono">
                {atom.fract_y.toFixed(5)}
              </td>
              <td className="py-2 px-2 text-right text-gray-700 font-mono">
                {atom.fract_z.toFixed(5)}
              </td>
              <td className="py-2 px-2 text-center text-gray-600">
                {atom.symmetry_multiplicity && atom.wyckoff_symbol
                  ? `${atom.symmetry_multiplicity}${atom.wyckoff_symbol}`
                  : atom.wyckoff_symbol || "-"}
              </td>
              <td className="py-2 px-2 text-right text-gray-700">
                {atom.occupancy.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
