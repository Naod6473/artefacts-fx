// Garde des effets proposés par les membres : une fois fusionné, un effet de la communauté tourne sur naod.fr comme
// les autres, hors bac à sable. Une liste noire de mots se contourne (["constr" + "uctor"]…), alors on analyse les
// portées : toute variable qui n'est pas déclarée dans le fichier doit être une des globales inoffensives ci-dessous.
// Sans window, document, fetch, top… l'effet ne peut rien atteindre ; le seul reste, le constructeur Function, est
// bloqué par la CSP du site (pas de 'unsafe-eval'). Utilisé par tools/check.mjs (CI) et le bac à sable.
import { parse } from "acorn";
import { analyze } from "eslint-scope";

export const GLOBALES = new Set([
  "Math", "Number", "Array", "Object", "String", "Boolean", "Symbol", "JSON", "Map", "Set", "WeakMap", "WeakSet",
  "Infinity", "NaN", "undefined", "isFinite", "isNaN", "parseInt", "parseFloat",
  "Float32Array", "Float64Array", "Int8Array", "Int16Array", "Int32Array", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array",
  "Error", "TypeError", "RangeError",
]);

/** Les problèmes de sûreté du code d'un effet, en anglais comme les autres messages de check.mjs ; [] si rien. */
export function surete(code) {
  let ast;
  try {
    ast = parse(code, { ecmaVersion: 2022, sourceType: "module", locations: true, ranges: true });
  } catch (e) {
    return [`syntax error: ${e.message}`];
  }
  const pbs = [];
  for (const n of ast.body) {
    if (n.type === "ImportDeclaration" && !/^(\.\.\/)+core\/index\.js$/.test(n.source.value)) pbs.push(`import from "${n.source.value}" (only ../../core/index.js)`);
    if ((n.type === "ExportNamedDeclaration" || n.type === "ExportAllDeclaration") && n.source) pbs.push("re-export from another module");
  }
  // import(), import.meta, eval indirect : rien à faire dans un effet
  (function marche(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "ImportExpression") pbs.push(`import() line ${n.loc.start.line}`);
    if (n.type === "MetaProperty") pbs.push(`${n.meta.name}.${n.property.name} line ${n.loc.start.line}`);
    for (const k in n) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(marche);
      else if (v && typeof v === "object" && k !== "loc") marche(v);
    }
  })(ast);
  const portees = analyze(ast, { ecmaVersion: 2022, sourceType: "module" });
  const vus = new Set();
  for (const ref of portees.globalScope.through) {
    const nom = ref.identifier.name;
    if (GLOBALES.has(nom) || vus.has(nom)) continue;
    vus.add(nom);
    pbs.push(`global "${nom}" line ${ref.identifier.loc.start.line} (not allowed in an effect)`);
  }
  return pbs;
}
