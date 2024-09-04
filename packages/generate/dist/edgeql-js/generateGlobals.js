"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGlobals = void 0;
const genutil_1 = require("../genutil");
const builders_1 = require("../builders");
const generateObjectTypes_1 = require("./generateObjectTypes");
const generateGlobals = ({ dir, globals, types }) => {
    const globalsByMod = {};
    for (const [_id, g] of globals.entries()) {
        const { mod } = (0, genutil_1.splitName)(g.name);
        globalsByMod[mod] = globalsByMod[mod] || [];
        globalsByMod[mod].push(g);
    }
    for (const [mod, gs] of Object.entries(globalsByMod)) {
        const code = dir.getModule(mod);
        const modName = mod.split("::").join("_");
        code.writeln([
            (0, builders_1.dts) `declare `,
            ...(0, genutil_1.frag) `const $${modName}__globals`,
            (0, builders_1.t) `: {`,
            ...gs
                .flatMap((g) => {
                const { name } = (0, genutil_1.splitName)(g.name);
                const targetType = types.get(g.target_id);
                const targetTypeRep = (0, generateObjectTypes_1.getStringRepresentation)(targetType, { types });
                return [
                    (0, builders_1.t) `  ${name}: _.syntax.$expr_Global<
              // "${g.name}",
              ${targetTypeRep.staticType},
              $.Cardinality.${g.card}
              >`,
                    (0, builders_1.t) `,`,
                ];
            })
                .slice(0, -1),
            (0, builders_1.t) `}`,
            (0, builders_1.r) ` = {`,
            ...gs
                .flatMap((g) => {
                const { name } = (0, genutil_1.splitName)(g.name);
                return [
                    (0, builders_1.r) `  ${name}: _.syntax.makeGlobal(
              "${g.name}",
              $.makeType(_.spec, "${g.target_id}", _.syntax.literal),
              $.Cardinality.${g.card})`,
                    (0, builders_1.ts) ` as any`,
                    (0, builders_1.r) `,`,
                ];
            })
                .slice(0, -1),
            (0, builders_1.r) `};`,
        ]);
        code.nl();
        code.registerRef(`$${modName}__globals`);
        code.addToDefaultExport((0, genutil_1.getRef)(`$${modName}__globals`, { prefix: "" }), "global");
    }
};
exports.generateGlobals = generateGlobals;
