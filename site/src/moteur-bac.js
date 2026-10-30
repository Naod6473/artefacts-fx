// Le moteur tel que le voit le bac à sable : construit à part en un seul fichier (assets/moteur-bac.js), il est passé
// en texte à l'iframe isolée, qui le charge depuis un blob. Le code proposé importe "../../core/index.js" : l'import
// est redirigé vers ce même blob.
export * from "../../core/index.js";
export { Lecteur } from "./lecteur.js";
export { parId, rendus } from "../../rendus/index.js";
