"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRuntimeSpec = void 0;
const builders_1 = require("../builders");
const generateRuntimeSpec = (params) => {
    const { dir, types, edgedbVersion } = params;
    const spec = dir.getPath("__spec__");
    spec.addImportStar("$", "./reflection", { allowFileExt: true });
    spec.writeln([
        (0, builders_1.dts) `declare `,
        `const spec`,
        (0, builders_1.t) `: $.introspect.Types`,
        (0, builders_1.r) ` = new $.StrictMap()`,
        `;`,
    ]);
    spec.nl();
    for (const type of types.values()) {
        spec.writeln([
            (0, builders_1.r) `spec.set("${type.id}", ${JSON.stringify(type)}`,
            (0, builders_1.ts) ` as any`,
            (0, builders_1.r) `);`,
        ]);
    }
    spec.nl();
    spec.writeln([
        (0, builders_1.dts) `declare `,
        `const complexParamKinds`,
        (0, builders_1.t) `: Set<$.TypeKind>`,
        (0, builders_1.r) ` = new Set([${edgedbVersion.major <= 2 ? `$.TypeKind.tuple, $.TypeKind.namedtuple` : ""}])`,
        `;`,
    ]);
    spec.addExport("spec");
    spec.addExport("complexParamKinds");
};
exports.generateRuntimeSpec = generateRuntimeSpec;
