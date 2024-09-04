"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateObjectTypes = exports.getStringRepresentation = void 0;
const builders_1 = require("../builders");
const genutil_1 = require("../genutil");
const singletonObjectTypes = new Set(["std::FreeObject"]);
const getStringRepresentation = (type, params) => {
    const suffix = params.castSuffix || `λICastableTo`;
    if (type.name === "anytype") {
        return {
            staticType: (0, genutil_1.frag) `${params.anytype ?? `$.BaseType`}`,
            runtimeType: [],
        };
    }
    if (type.name === "anytuple") {
        return {
            staticType: [`$.AnyTupleType`],
            runtimeType: [],
        };
    }
    if (type.name === "anyobject") {
        return {
            staticType: [`$.AnyObjectType`],
            runtimeType: [],
        };
    }
    if (type.name === "std::anypoint") {
        return {
            staticType: (0, genutil_1.frag) `${params.anytype ?? (0, genutil_1.getRef)("std::anypoint")}`,
            runtimeType: [],
        };
    }
    if (type.name === "std::anyenum") {
        return {
            staticType: [`$.EnumType`],
            runtimeType: [],
        };
    }
    const { types, casts } = params;
    if (type.kind === "object") {
        if (type.name === "std::BaseObject") {
            return {
                staticType: ["$.ObjectType"],
                runtimeType: [(0, genutil_1.getRef)(type.name)],
            };
        }
        if (type.union_of?.length) {
            const items = type.union_of.map((it) => (0, exports.getStringRepresentation)(types.get(it.id), params));
            return {
                staticType: (0, genutil_1.joinFrags)(items.map((it) => it.staticType), " | "),
                runtimeType: (0, genutil_1.joinFrags)(items.map((it) => it.runtimeType), " | "),
            };
        }
        return {
            staticType: [(0, genutil_1.getRef)(type.name)],
            runtimeType: [(0, genutil_1.getRef)(type.name)],
        };
    }
    else if (type.kind === "scalar") {
        return {
            staticType: [(0, genutil_1.getRef)(type.name), casts?.[type.id]?.length ? suffix : ""],
            runtimeType: [(0, genutil_1.getRef)(type.name)],
        };
    }
    else if (type.kind === "array") {
        return {
            staticType: (0, genutil_1.frag) `$.ArrayType<${(0, exports.getStringRepresentation)(types.get(type.array_element_id), params)
                .staticType}>`,
            runtimeType: (0, genutil_1.frag) `$.ArrayType(${(0, exports.getStringRepresentation)(types.get(type.array_element_id), params)
                .runtimeType})`,
        };
    }
    else if (type.kind === "tuple") {
        const isNamed = type.tuple_elements[0].name !== "0";
        if (isNamed) {
            const itemsStatic = (0, genutil_1.joinFrags)(type.tuple_elements.map((it) => (0, genutil_1.frag) `${it.name}: ${(0, exports.getStringRepresentation)(types.get(it.target_id), params)
                .staticType}`), ", ");
            const itemsRuntime = (0, genutil_1.joinFrags)(type.tuple_elements.map((it) => (0, genutil_1.frag) `${it.name}: ${(0, exports.getStringRepresentation)(types.get(it.target_id), params)
                .runtimeType}`), ", ");
            return {
                staticType: (0, genutil_1.frag) `$.NamedTupleType<{${itemsStatic}}>`,
                runtimeType: (0, genutil_1.frag) `$.NamedTupleType({${itemsRuntime}})`,
            };
        }
        else {
            const items = type.tuple_elements
                .map((it) => it.target_id)
                .map((id) => types.get(id))
                .map((el) => (0, exports.getStringRepresentation)(el, params));
            return {
                staticType: (0, genutil_1.frag) `$.TupleType<[${(0, genutil_1.joinFrags)(items.map((it) => it.staticType), ", ")}]>`,
                runtimeType: (0, genutil_1.frag) `$.TupleType([${(0, genutil_1.joinFrags)(items.map((it) => it.runtimeType), ", ")}])`,
            };
        }
    }
    else if (type.kind === "range") {
        return {
            staticType: (0, genutil_1.frag) `$.RangeType<${(0, exports.getStringRepresentation)(types.get(type.range_element_id), params)
                .staticType}>`,
            runtimeType: (0, genutil_1.frag) `$.RangeType(${(0, exports.getStringRepresentation)(types.get(type.range_element_id), params)
                .runtimeType})`,
        };
    }
    else if (type.kind === "multirange") {
        return {
            staticType: (0, genutil_1.frag) `$.MultiRangeType<${(0, exports.getStringRepresentation)(types.get(type.multirange_element_id), params)
                .staticType}>`,
            runtimeType: (0, genutil_1.frag) `$.MultiRangeType(${(0, exports.getStringRepresentation)(types.get(type.multirange_element_id), params)
                .runtimeType})`,
        };
    }
    else {
        throw new Error(`Invalid type: ${JSON.stringify(type, null, 2)}`);
    }
};
exports.getStringRepresentation = getStringRepresentation;
const generateObjectTypes = (params) => {
    const { dir, types } = params;
    const descendents = generatePolyTypenames(types);
    for (const type of types.values()) {
        if (type.kind !== "object") {
            continue;
        }
        const isUnionType = Boolean(type.union_of?.length);
        const isIntersectionType = Boolean(type.intersection_of?.length);
        if (isIntersectionType || isUnionType) {
            continue;
        }
        const { mod, name } = (0, genutil_1.splitName)(type.name);
        const body = dir.getModule(mod);
        body.registerRef(type.name, type.id);
        const ref = (0, genutil_1.getRef)(type.name);
        const ptrToLine = (ptr) => {
            const card = `$.Cardinality.${ptr.card}`;
            const target = types.get(ptr.target_id);
            const { staticType, runtimeType } = (0, exports.getStringRepresentation)(target, {
                types,
            });
            return {
                key: ptr.name,
                staticType,
                runtimeType,
                card,
                kind: ptr.kind,
                isExclusive: ptr.is_exclusive,
                is_computed: ptr.is_computed ?? false,
                is_readonly: ptr.is_readonly ?? false,
                hasDefault: ptr.has_default ?? false,
                lines: (ptr.pointers ?? [])
                    .filter((p) => p.name !== "@target" && p.name !== "@source")
                    .map(ptrToLine),
            };
        };
        const lines = [
            ...type.pointers,
            ...type.backlinks,
            ...type.backlink_stubs,
        ].map(ptrToLine);
        const fieldNames = new Set(lines.map((l) => l.key));
        const baseTypesUnion = type.bases.length
            ? (0, genutil_1.frag) `${(0, genutil_1.joinFrags)(type.bases.map((base) => {
                const baseType = types.get(base.id);
                const overloadedFields = [
                    ...baseType.pointers,
                    ...baseType.backlinks,
                    ...baseType.backlink_stubs,
                ]
                    .filter((field) => fieldNames.has(field.name))
                    .map((field) => (0, genutil_1.quote)(field.name));
                const baseRef = (0, genutil_1.getRef)(baseType.name);
                return overloadedFields.length
                    ? (0, genutil_1.frag) `Omit<${baseRef}λShape, ${overloadedFields.join(" | ")}>`
                    : (0, genutil_1.frag) `${baseRef}λShape`;
            }), " & ")} & `
            : ``;
        body.writeln([
            (0, builders_1.t) `export `,
            (0, builders_1.dts) `declare `,
            (0, builders_1.t) `type ${ref}λShape = $.typeutil.flatten<${baseTypesUnion}{`,
        ]);
        body.indented(() => {
            for (const line of lines) {
                if (line.kind === "link") {
                    if (!line.lines.length) {
                        body.writeln([
                            (0, builders_1.t) `${(0, genutil_1.quote)(line.key)}: $.LinkDesc<${line.staticType}, ${line.card}, {}, ${line.isExclusive.toString()}, ${line.is_computed.toString()},  ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
                        ]);
                    }
                    else {
                        body.writeln([
                            (0, builders_1.t) `${(0, genutil_1.quote)(line.key)}: $.LinkDesc<${line.staticType}, ${line.card}, {`,
                        ]);
                        body.indented(() => {
                            for (const linkProp of line.lines) {
                                body.writeln([
                                    (0, builders_1.t) `${(0, genutil_1.quote)(linkProp.key)}: $.PropertyDesc<${linkProp.staticType}, ${linkProp.card}>;`,
                                ]);
                            }
                        });
                        body.writeln([
                            (0, builders_1.t) `}, ${line.isExclusive.toString()}, ${line.is_computed.toString()}, ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
                        ]);
                    }
                }
                else {
                    body.writeln([
                        (0, builders_1.t) `${(0, genutil_1.quote)(line.key)}: $.PropertyDesc<${line.staticType}, ${line.card}, ${line.isExclusive.toString()}, ${line.is_computed.toString()}, ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
                    ]);
                }
            }
        });
        body.writeln([(0, builders_1.t) `}>;`]);
        body.writeln([
            (0, builders_1.dts) `declare `,
            (0, builders_1.t) `type ${ref} = $.ObjectType<${(0, genutil_1.quote)(type.name)}, ${ref}λShape, null, [`,
        ]);
        const bases = type.bases
            .map((b) => types.get(b.id))
            .map((b) => (0, genutil_1.getRef)(b.name));
        body.indented(() => {
            for (const b of bases) {
                body.writeln([(0, builders_1.t) `...${b}['__exclusives__'],`]);
            }
        });
        for (const ex of type.exclusives) {
            body.writeln([
                (0, builders_1.t) `  {`,
                ...Object.keys(ex).map((key) => {
                    const target = types.get(ex[key].target_id);
                    const { staticType } = (0, exports.getStringRepresentation)(target, { types });
                    const card = `$.Cardinality.One | $.Cardinality.AtMostOne `;
                    return (0, builders_1.t) `${key}: {__element__: ${staticType}, __cardinality__: ${card}},`;
                }),
                (0, builders_1.t) `},`,
            ]);
        }
        body.writeln([
            (0, builders_1.t) `], ${[
                ...(!type.is_abstract ? [type.name] : []),
                ...(descendents.get(type.id)?.values() ?? []),
            ]
                .map((typename) => (0, genutil_1.quote)(typename))
                .join(" | ") || "never"}>;`,
        ]);
        if (type.name === "std::Object") {
            body.writeln([(0, builders_1.t) `export `, (0, builders_1.dts) `declare `, (0, builders_1.t) `type $Object = ${ref}`]);
        }
        const literal = (0, genutil_1.getRef)(type.name, { prefix: "" });
        body.writeln([
            (0, builders_1.dts) `declare `,
            ...(0, genutil_1.frag) `const ${ref}`,
            (0, builders_1.dts) `: ${ref}`,
            (0, builders_1.r) ` = $.makeType`,
            (0, builders_1.ts) `<${ref}>`,
            (0, builders_1.r) `(_.spec, ${(0, genutil_1.quote)(type.id)}, _.syntax.literal);`,
        ]);
        body.addExport(ref);
        const typeCard = singletonObjectTypes.has(type.name) ? "One" : "Many";
        body.nl();
        body.writeln([
            (0, builders_1.dts) `declare `,
            ...(0, genutil_1.frag) `const ${literal}`,
            (0, builders_1.t) `: $.$expr_PathNode<$.TypeSet<${ref}, $.Cardinality.${typeCard}>, null> `,
            (0, builders_1.r) `= _.syntax.$PathNode($.$toSet(${ref}, $.Cardinality.${typeCard}), null);`,
        ]);
        body.nl();
        body.addExport(literal);
        body.addToDefaultExport(literal, name);
    }
};
exports.generateObjectTypes = generateObjectTypes;
function generatePolyTypenames(types) {
    const descendents = new Map();
    const visit = (current, descendent) => {
        if (current.kind !== "object") {
            return;
        }
        for (const base of current.bases) {
            if (!descendents.has(base.id)) {
                descendents.set(base.id, new Set());
            }
            descendents.get(base.id).add(descendent.name);
            visit(types.get(base.id), descendent);
        }
    };
    for (const type of types.values()) {
        if (type.kind === "object" && !type.is_abstract) {
            visit(type, type);
        }
    }
    return descendents;
}
