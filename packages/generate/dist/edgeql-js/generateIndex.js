"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIndex = generateIndex;
const builders_1 = require("../builders");
const genutil = __importStar(require("../genutil"));
function generateIndex(params) {
    const { dir } = params;
    const index = dir.getPath("index");
    index.addExportStar("./external", {
        allowFileExt: true,
    });
    index.addImportStar("$", "./reflection");
    index.addExportFrom({ createClient: true }, "edgedb");
    index.addImportStar("$syntax", "./syntax", { allowFileExt: true });
    index.addImportStar("$op", "./operators", { allowFileExt: true });
    const spreadModules = [
        {
            name: "$op",
            keys: ["op"],
        },
        {
            name: "$syntax",
            keys: [
                "ASC",
                "DESC",
                "EMPTY_FIRST",
                "EMPTY_LAST",
                "alias",
                "array",
                "cast",
                "detached",
                "for",
                "insert",
                "is",
                "literal",
                "namedTuple",
                "optional",
                "select",
                "set",
                "tuple",
                "with",
                "withParams",
            ],
        },
        {
            name: "_default",
            module: dir.getModule("default"),
        },
        { name: "_std", module: dir.getModule("std") },
    ];
    const topLevelModules = new Map([...dir._modules.entries()].filter(([_, path]) => path.length === 1));
    const excludedKeys = new Set(topLevelModules.keys());
    const spreadTypes = [];
    for (const { name, keys: providedKeys, module } of spreadModules) {
        if (module?.isEmpty()) {
            continue;
        }
        const keys = providedKeys ?? module.getDefaultExportKeys();
        const conflictingKeys = keys.filter((key) => excludedKeys.has(key));
        let typeStr;
        if (conflictingKeys.length) {
            typeStr = `Omit<typeof ${name}, ${conflictingKeys
                .map(genutil.quote)
                .join(" | ")}>`;
        }
        else {
            typeStr = `typeof ${name}`;
        }
        spreadTypes.push(name === "$syntax" ? `$.util.OmitDollarPrefixed<${typeStr}>` : typeStr);
        for (const key of keys) {
            excludedKeys.add(key);
        }
    }
    index.nl();
    index.writeln([
        (0, builders_1.dts) `declare `,
        `const ExportDefault`,
        (0, builders_1.t) `: ${spreadTypes.reverse().join(" & \n  ")} & {`,
    ]);
    const defaultSpreadTypes = new Set(dir.getModule("default").getDefaultExportKeys());
    index.indented(() => {
        for (const [moduleName, internalName] of topLevelModules) {
            if (dir.getModule(moduleName).isEmpty())
                continue;
            let typeStr = `typeof _${internalName}`;
            if (defaultSpreadTypes.has(moduleName)) {
                typeStr += ` & typeof _default.${moduleName}`;
            }
            index.writeln([(0, builders_1.t) `${genutil.quote(moduleName)}: ${typeStr};`]);
        }
    });
    index.writeln([(0, builders_1.t) `}`, (0, builders_1.r) ` = {`]);
    index.indented(() => {
        for (const { name, module } of [...spreadModules].reverse()) {
            if (module?.isEmpty()) {
                continue;
            }
            index.writeln([
                (0, builders_1.r) `...${name === "$syntax" ? `$.util.omitDollarPrefixed($syntax)` : name},`,
            ]);
        }
        for (const [moduleName, internalName] of topLevelModules) {
            if (dir.getModule(moduleName).isEmpty()) {
                continue;
            }
            index.addImportDefault(`_${internalName}`, `./modules/${internalName}`, {
                allowFileExt: true,
            });
            const valueStr = defaultSpreadTypes.has(moduleName)
                ? `Object.freeze({ ..._${internalName}, ..._default.${moduleName} })`
                : `_${internalName}`;
            index.writeln([(0, builders_1.r) `${genutil.quote(moduleName)}: ${valueStr},`]);
        }
    });
    index.writeln([(0, builders_1.r) `};`]);
    index.addExportDefault("ExportDefault");
    index.writeln([(0, builders_1.r) `const Cardinality = $.Cardinality;`]);
    index.writeln([(0, builders_1.dts) `declare `, (0, builders_1.t) `type Cardinality = $.Cardinality;`]);
    index.addExport("Cardinality");
    index.writeln([
        (0, builders_1.t) `export `,
        (0, builders_1.dts) `declare `,
        (0, builders_1.t) `type Set<
  Type extends $.BaseType,
  Card extends $.Cardinality = $.Cardinality.Many
> = $.TypeSet<Type, Card>;`,
    ]);
}
