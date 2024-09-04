"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScalars = void 0;
const genutil_1 = require("../genutil");
const builders_1 = require("../builders");
const genutil_2 = require("../genutil");
const generateScalars = (params) => {
    const { dir, types, casts, scalars } = params;
    for (const type of types.values()) {
        if (type.kind !== "scalar") {
            continue;
        }
        const { mod, name: _name } = (0, genutil_1.splitName)(type.name);
        const sc = dir.getModule(mod);
        sc.registerRef(type.name, type.id);
        const ref = (0, genutil_1.getRef)(type.name);
        const literal = (0, genutil_1.getRef)(type.name, { prefix: "" });
        if (type.name === "std::anyenum") {
            continue;
        }
        if (type.is_abstract) {
            const scalarType = scalars.get(type.id);
            if (scalarType.children.length) {
                const children = [
                    ...new Set(scalarType.children.map((desc) => (genutil_2.$.introspect.typeMapping.get(desc.id) ?? desc).name)),
                ].map((descName) => descName === "std::anyenum" ? "$.EnumType" : (0, genutil_1.getRef)(descName));
                sc.writeln([
                    (0, builders_1.dts) `declare `,
                    (0, builders_1.t) `type ${ref} = ${(0, genutil_1.joinFrags)(children, " | ")};`,
                ]);
                sc.nl();
                sc.addExport(ref, { typeOnly: true });
            }
            else if (scalarType.bases.length) {
                const bases = scalarType.bases.map((base) => (0, genutil_1.getRef)(base.name));
                sc.writeln([(0, builders_1.t) `interface ${ref} extends ${(0, genutil_1.joinFrags)(bases, ", ")} {}`]);
                sc.writeln([
                    (0, builders_1.dts) `declare `,
                    ...(0, genutil_1.frag) `const ${ref}`,
                    (0, builders_1.t) `: ${ref}`,
                    (0, builders_1.r) ` = $.makeType`,
                    (0, builders_1.ts) `<${ref}>`,
                    (0, builders_1.r) `(_.spec, "${type.id}", _.syntax.literal);`,
                ]);
                sc.nl();
                sc.addExport(ref);
            }
            continue;
        }
        if (type.enum_values && type.enum_values.length) {
            sc.writeln([
                (0, builders_1.t) `export `,
                (0, builders_1.dts) `declare `,
                (0, builders_1.t) `type ${ref} = {\n`,
                ...type.enum_values.map((val) => (0, builders_1.t) `  ${(0, genutil_1.quote)(val)}: $.$expr_Literal<${ref}>;\n`),
                (0, builders_1.t) `} & `,
                (0, builders_1.t) `$.EnumType<${(0, genutil_1.quote)(type.name)}, [${type.enum_values
                    .map((val) => (0, genutil_1.quote)(val))
                    .join(", ")}]>;`,
            ]);
            sc.writeln([
                (0, builders_1.dts) `declare `,
                ...(0, genutil_1.frag) `const ${literal}`,
                (0, builders_1.t) `: ${ref}`,
                (0, builders_1.r) ` = $.makeType`,
                (0, builders_1.ts) `<${ref}>`,
                (0, builders_1.r) `(_.spec, "${type.id}", _.syntax.literal);`,
            ]);
            sc.nl();
            sc.addExport(literal);
            sc.addToDefaultExport(literal, _name);
            continue;
        }
        const tsType = (0, genutil_1.toTSScalarType)(type, types);
        if (type.cast_type) {
            const mapped = types.get(type.cast_type);
            const mappedRef = (0, genutil_1.getRef)(mapped.name);
            const extraTypes = (genutil_1.scalarToLiteralMapping[mapped.name]?.extraTypes || ["never"]).join(" | ");
            const argTypes = (genutil_1.scalarToLiteralMapping[mapped.name]?.argTypes ?? []).join(" | ");
            sc.writeln([
                (0, builders_1.t) `export `,
                (0, builders_1.dts) `declare `,
                (0, builders_1.t) `type ${ref} = $.ScalarType<"${mapped.name}", ${tsType}${argTypes ? `, ${tsType} | ${argTypes}` : ""}>;`,
            ]);
            sc.writeln([
                (0, builders_1.dts) `declare `,
                ...(0, genutil_1.frag) `const ${literal}`,
                (0, builders_1.t) `: $.scalarTypeWithConstructor<${mappedRef}, ${extraTypes}>`,
                (0, builders_1.r) ` = $.makeType`,
                (0, builders_1.ts) `<$.scalarTypeWithConstructor<${mappedRef}, ${extraTypes}>>`,
                (0, builders_1.r) `(_.spec, "${type.id}", _.syntax.literal);`,
            ]);
        }
        else {
            const extraTypes = (genutil_1.scalarToLiteralMapping[type.name]?.extraTypes || ["never"]).join(" | ");
            const argTypes = (genutil_1.scalarToLiteralMapping[type.name]?.argTypes ?? []).join(" | ");
            sc.writeln([
                (0, builders_1.t) `export `,
                (0, builders_1.dts) `declare `,
                (0, builders_1.t) `type ${ref} = $.ScalarType<"${type.name}", ${tsType}${argTypes ? `, ${tsType} | ${argTypes}` : ""}>;`,
            ]);
            sc.writeln([
                (0, builders_1.dts) `declare `,
                ...(0, genutil_1.frag) `const ${literal}`,
                (0, builders_1.t) `: $.scalarTypeWithConstructor<${ref}, ${extraTypes}>`,
                (0, builders_1.r) ` = $.makeType`,
                (0, builders_1.ts) `<$.scalarTypeWithConstructor<${ref}, ${extraTypes}>>`,
                (0, builders_1.r) `(_.spec, "${type.id}", _.syntax.literal);`,
            ]);
        }
        if (casts.implicitCastFromMap[type.id]?.length) {
            sc.writeln([
                (0, builders_1.t) `export `,
                (0, builders_1.dts) `declare `,
                (0, builders_1.t) `type ${ref}λICastableTo = ${(0, genutil_1.joinFrags)([
                    ref,
                    ...casts.implicitCastFromMap[type.id].map((typeId) => (0, genutil_1.getRef)(types.get(typeId).name)),
                ], " | ")};`,
            ]);
        }
        const assignableMap = casts.assignableByMap[type.id] || [];
        if (casts.assignableByMap[type.id]?.length) {
            sc.writeln([
                (0, builders_1.t) `export `,
                (0, builders_1.dts) `declare `,
                (0, builders_1.t) `type ${ref}λIAssignableBy = ${(0, genutil_1.joinFrags)(assignableMap.length
                    ? [
                        ref,
                        ...assignableMap.map((typeId) => (0, genutil_1.getRef)(types.get(typeId).name)),
                    ]
                    : [ref], " | ")};`,
            ]);
        }
        sc.addExport(literal);
        if (_name !== "number")
            sc.addToDefaultExport(literal, _name);
        sc.nl();
    }
};
exports.generateScalars = generateScalars;
