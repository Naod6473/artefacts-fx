# Documentation d'Inkra, reprise telle quelle

Copie sans retouche de https://github.com/inkrajs/docs (licence MIT, © 2026 Inkra contributors), commit
26845a0b9758a0a50a0df1dab5a3290df3c5a736, pour la page Interfaces du site (site/interfaces/app.tsx). Les composants
viennent du paquet npm `@inkra/react` 0.12.0 (https://github.com/inkrajs/inkra, MIT). Polices : SIL OFL, voir
THIRD_PARTY_NOTICES.md.

Seules différences, appliquées à la construction (build.mjs, extension « inkra-docs ») : les liens internes deviennent
`?p=/components/…`, et App.tsx exporte les morceaux que la page réutilise. Les polices de thème optionnelles
(public/fonts/theme, 56 Mo) ne sont pas copiées.
