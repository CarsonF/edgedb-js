"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservedIdents = exports.literalToScalarMapping = exports.scalarToLiteralMapping = exports.makePlainIdent = exports.headerComment = exports.splitName = exports.$ = exports.StrictMapSet = exports.OperatorKind = void 0;
exports.toIdent = toIdent;
exports.quote = quote;
exports.toTSScalarType = toTSScalarType;
exports.toTSObjectType = toTSObjectType;
exports.capitalize = capitalize;
exports.displayName = displayName;
exports.getInternalName = getInternalName;
exports.makeValidIdent = makeValidIdent;
exports.getRef = getRef;
exports.frag = frag;
exports.joinFrags = joinFrags;
exports.writeDirWithTarget = writeDirWithTarget;
exports.exitWithError = exitWithError;
const index_1 = require("edgedb/dist/reflection/index");
var index_2 = require("edgedb/dist/reflection/index");
Object.defineProperty(exports, "OperatorKind", { enumerable: true, get: function () { return index_2.OperatorKind; } });
Object.defineProperty(exports, "StrictMapSet", { enumerable: true, get: function () { return index_2.StrictMapSet; } });
var edgedb_1 = require("edgedb");
Object.defineProperty(exports, "$", { enumerable: true, get: function () { return edgedb_1.$; } });
const edgedb_2 = require("edgedb");
exports.splitName = index_1.util.splitName;
exports.headerComment = `// GENERATED by @edgedb/generate v0.5.5\n\n`;
function toIdent(name) {
    if (name.includes("::")) {
        throw new Error(`toIdent: invalid name ${name}`);
    }
    return name.replace(/([^a-zA-Z0-9_]+)/g, "_");
}
const makePlainIdent = (name) => {
    if (exports.reservedIdents.has(name)) {
        return `$${name}`;
    }
    const replaced = name.replace(/[^A-Za-z0-9_]/g, (match) => "0x" + match.codePointAt(0).toString(16));
    return replaced !== name ? `$${replaced}` : name;
};
exports.makePlainIdent = makePlainIdent;
function quote(val) {
    return JSON.stringify(val.toString());
}
exports.scalarToLiteralMapping = {
    "std::int16": { type: "number" },
    "std::int32": { type: "number" },
    "std::int64": { type: "number", extraTypes: ["string"] },
    "std::float32": { type: "number" },
    "std::float64": { type: "number" },
    "std::number": {
        type: "number",
        literalKind: "typeof",
        extraTypes: ["string"],
    },
    "std::decimal": { type: "string" },
    "std::str": { type: "string", literalKind: "typeof" },
    "std::uuid": { type: "string" },
    "std::json": { type: "unknown" },
    "std::bool": { type: "boolean", literalKind: "typeof" },
    "std::bigint": { type: "bigint", literalKind: "typeof" },
    "std::bytes": { type: "Uint8Array", literalKind: "instanceof" },
    "std::datetime": {
        type: "Date",
        literalKind: "instanceof",
        extraTypes: ["string"],
    },
    "std::duration": {
        type: "edgedb.Duration",
        literalKind: "instanceof",
        extraTypes: ["string"],
    },
    "cal::local_datetime": {
        type: "edgedb.LocalDateTime",
        literalKind: "instanceof",
        extraTypes: ["string"],
    },
    "cal::local_date": {
        type: "edgedb.LocalDate",
        literalKind: "instanceof",
        extraTypes: ["string"],
    },
    "cal::local_time": {
        type: "edgedb.LocalTime",
        literalKind: "instanceof",
        extraTypes: ["string"],
    },
    "cal::relative_duration": {
        type: "edgedb.RelativeDuration",
        literalKind: "instanceof",
        extraTypes: ["string"],
    },
    "cal::date_duration": {
        type: "edgedb.DateDuration",
        literalKind: "instanceof",
        extraTypes: ["string"],
    },
    "cfg::memory": {
        type: "edgedb.ConfigMemory",
        literalKind: "instanceof",
        extraTypes: ["string"],
    },
    "ext::pgvector::vector": {
        type: "Float32Array",
        literalKind: "instanceof",
        extraTypes: ["number[]"],
        argTypes: ["number[]"],
    },
};
exports.literalToScalarMapping = {};
for (const [scalarType, { type, literalKind }] of Object.entries(exports.scalarToLiteralMapping)) {
    if (literalKind) {
        if (exports.literalToScalarMapping[type]) {
            throw new Error(`literal type '${type}' cannot be mapped to multiple scalar types`);
        }
        exports.literalToScalarMapping[type] = { type: scalarType, literalKind };
    }
}
function toTSScalarType(type, types, opts = {
    edgedbDatatypePrefix: "_.",
}) {
    switch (type.kind) {
        case "scalar": {
            if (type.enum_values && type.enum_values.length) {
                if (opts.getEnumRef) {
                    return [opts.getEnumRef(type)];
                }
                return [getRef(type.name, { prefix: "" })];
            }
            if (type.material_id && !exports.scalarToLiteralMapping[type.name]) {
                return toTSScalarType(types.get(type.material_id), types, opts);
            }
            const literalType = exports.scalarToLiteralMapping[type.name]?.type ?? "unknown";
            return [
                (literalType.startsWith("edgedb.") ? opts.edgedbDatatypePrefix : "") +
                    literalType,
            ];
        }
        case "array": {
            const tn = toTSScalarType(types.get(type.array_element_id), types, opts);
            return frag `${tn}[]`;
        }
        case "tuple": {
            if (!type.tuple_elements.length) {
                return ["[]"];
            }
            if (type.tuple_elements[0].name &&
                Number.isNaN(parseInt(type.tuple_elements[0].name, 10))) {
                const res = [];
                for (const { name, target_id } of type.tuple_elements) {
                    const tn = toTSScalarType(types.get(target_id), types, opts);
                    res.push(frag `${name}: ${tn}`);
                }
                return frag `{${joinFrags(res, ", ")}}`;
            }
            else {
                const res = [];
                for (const { target_id } of type.tuple_elements) {
                    const tn = toTSScalarType(types.get(target_id), types, opts);
                    res.push(tn);
                }
                return frag `[${joinFrags(res, ", ")}]`;
            }
        }
        case "range": {
            const tn = toTSScalarType(types.get(type.range_element_id), types, opts);
            return frag `${opts.edgedbDatatypePrefix}edgedb.Range<${tn}>`;
        }
        case "multirange": {
            const tn = toTSScalarType(types.get(type.multirange_element_id), types, opts);
            return frag `${opts.edgedbDatatypePrefix}edgedb.MultiRange<${tn}>`;
        }
        default:
            index_1.util.assertNever(type);
    }
}
function toTSObjectType(type, types, currentMod, code, level = 0) {
    if (type.intersection_of && type.intersection_of.length) {
        const res = [];
        for (const { id: subId } of type.intersection_of) {
            const sub = types.get(subId);
            res.push(toTSObjectType(sub, types, currentMod, code, level + 1));
        }
        const ret = joinFrags(res, " & ");
        return level > 0 ? frag `(${ret})` : ret;
    }
    if (type.union_of && type.union_of.length) {
        const res = [];
        for (const { id: subId } of type.union_of) {
            const sub = types.get(subId);
            res.push(toTSObjectType(sub, types, currentMod, code, level + 1));
        }
        const ret = joinFrags(res, " | ");
        return level > 0 ? frag `(${ret})` : ret;
    }
    return [getRef(type.name, { prefix: "" })];
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function displayName(str) {
    const { name } = (0, exports.splitName)(str);
    const stripped = "$" +
        name
            .replace(/[^$0-9a-zA-Z]/g, " ")
            .split(" ")
            .filter((x) => !!x)
            .map(capitalize)
            .join("");
    return stripped;
}
function getInternalName({ fqn, id }) {
    const { name } = (0, exports.splitName)(fqn);
    return makeValidIdent({ id, name });
}
function makeValidIdent({ id, name, skipKeywordCheck, }) {
    let strippedName = name.replace(/^_|[^A-Za-z0-9_]/g, "");
    if (strippedName !== name ||
        (!skipKeywordCheck && exports.reservedIdents.has(strippedName))) {
        strippedName += `_${id.toLowerCase().replace(/[^0-9a-f]/g, "")}`;
    }
    return strippedName;
}
function getRef(name, opts) {
    return {
        type: "identRef",
        name,
        opts: {
            prefix: opts?.prefix ?? "$",
        },
    };
}
function frag(strings, ...exprs) {
    const frags = [];
    for (let i = 0; i < strings.length; i++) {
        frags.push(strings[i]);
        if (exprs[i]) {
            if (Array.isArray(exprs[i])) {
                frags.push(...exprs[i]);
            }
            else {
                frags.push(exprs[i]);
            }
        }
    }
    return frags;
}
function joinFrags(frags, sep) {
    const joined = [];
    for (const fragment of frags) {
        joined.push(...(Array.isArray(fragment) ? fragment : [fragment]), sep);
    }
    return joined.slice(0, -1);
}
exports.reservedIdents = new Set([
    "do",
    "if",
    "in",
    "for",
    "let",
    "new",
    "try",
    "var",
    "case",
    "else",
    "enum",
    "eval",
    "null",
    "this",
    "true",
    "void",
    "with",
    "await",
    "break",
    "catch",
    "class",
    "const",
    "false",
    "super",
    "throw",
    "while",
    "yield",
    "delete",
    "export",
    "import",
    "public",
    "return",
    "static",
    "switch",
    "typeof",
    "default",
    "extends",
    "finally",
    "package",
    "private",
    "continue",
    "debugger",
    "function",
    "arguments",
    "interface",
    "protected",
    "implements",
    "instanceof",
    "Object",
]);
async function writeDirWithTarget(dir, target, params) {
    const { outputDir, written = new Set() } = params;
    if (target === "ts") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".ts",
            moduleExtension: "",
            written,
        });
    }
    else if (target === "mts") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".mts",
            moduleExtension: ".mjs",
            written,
        });
    }
    else if (target === "cjs") {
        await dir.write(outputDir, {
            mode: "js",
            moduleKind: "cjs",
            fileExtension: ".js",
            moduleExtension: "",
            written,
        });
        await dir.write(outputDir, {
            mode: "dts",
            moduleKind: "esm",
            fileExtension: ".d.ts",
            moduleExtension: "",
            written,
        });
    }
    else if (target === "esm") {
        await dir.write(outputDir, {
            mode: "js",
            moduleKind: "esm",
            fileExtension: ".mjs",
            moduleExtension: ".mjs",
            written,
        });
        await dir.write(outputDir, {
            mode: "dts",
            moduleKind: "esm",
            fileExtension: ".d.mts",
            moduleExtension: "",
            written,
        });
    }
    else if (target === "deno") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".ts",
            moduleExtension: ".ts",
            written,
        });
    }
}
function exitWithError(message) {
    console.error(message);
    edgedb_2.adapter.exit(1);
    throw new Error();
}
