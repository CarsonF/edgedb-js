"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFunctionTypes = void 0;
exports.allowsLiterals = allowsLiterals;
exports.generateFuncopTypes = generateFuncopTypes;
exports.generateFuncopDef = generateFuncopDef;
exports.getReturnCardinality = getReturnCardinality;
exports.generateReturnCardinality = generateReturnCardinality;
const genutil_1 = require("../genutil");
const builders_1 = require("../builders");
const generateObjectTypes_1 = require("./generateObjectTypes");
const funcoputil_1 = require("../funcoputil");
const generateFunctionTypes = ({ dir, functions, types, casts, }) => {
    generateFuncopTypes(dir, types, casts, functions, "Function", "FuncExpr", true, (code, _funcDef, _args, _namedArgs, returnType) => {
        code.writeln([(0, builders_1.t) `${returnType}`]);
    }, (code, funcName) => {
        code.writeln([(0, builders_1.r) `__name__: ${(0, genutil_1.quote)(funcName)},`]);
        code.writeln([(0, builders_1.r) `__args__: positionalArgs,`]);
        code.writeln([(0, builders_1.r) `__namedargs__: namedArgs,`]);
    });
};
exports.generateFunctionTypes = generateFunctionTypes;
function allowsLiterals(type, anytypes) {
    return ((type.name === "anytype" && anytypes?.kind === "noncastable") ||
        type.kind === "scalar");
}
function generateFuncopTypes(dir, types, casts, funcops, funcopExprKind, typeDefSuffix, optionalUndefined, typeDefGen, implReturnGen) {
    const typeSpecificities = (0, funcoputil_1.getTypesSpecificity)(types, casts);
    const implicitCastableRootTypes = (0, funcoputil_1.getImplicitCastableRootTypes)(casts);
    for (const [funcName, _funcDefs] of funcops.entries()) {
        const { mod, name } = (0, genutil_1.splitName)(funcName);
        const code = dir.getModule(mod);
        code.registerRef(funcName, _funcDefs[0].id);
        code.addToDefaultExport((0, genutil_1.getRef)(funcName, { prefix: "" }), name);
        if (funcName === "std::range") {
            code.writeln([(0, builders_1.dts) `declare `, (0, builders_1.all) `const range = _.syntax.$range;`]);
            code.nl();
            continue;
        }
        const funcDefs = (0, funcoputil_1.expandFuncopAnytypeOverloads)((0, funcoputil_1.sortFuncopOverloads)(_funcDefs, typeSpecificities), types, casts, implicitCastableRootTypes);
        const overloadsBuf = new builders_1.CodeBuffer();
        let overloadDefIndex = 1;
        for (const funcDef of funcDefs) {
            const { params } = funcDef;
            const hasParams = params.positional.length + params.named.length > 0;
            const namedParamsOverloads = !hasParams ||
                params.positional.length === 0 ||
                params.named.some((param) => !(param.typemod === "OptionalType" || param.hasDefault))
                ? [true]
                : params.named.length > 0
                    ? [true, false]
                    : [false];
            for (const hasNamedParams of namedParamsOverloads) {
                if (funcDef.description) {
                    overloadsBuf.writeln([
                        (0, builders_1.t) `/**
 * ${funcDef.description.replace(/\*\//g, "")}
 */`,
                    ]);
                }
                const functionTypeName = (0, genutil_1.frag) `${(0, genutil_1.getRef)(funcName, {
                    prefix: "",
                })}λ${typeDefSuffix}${overloadDefIndex++ > 1 ? String(overloadDefIndex - 1) : ""}`;
                const functionTypeSig = (0, genutil_1.frag) `${functionTypeName}${hasParams
                    ? `<${[
                        ...(hasNamedParams ? ["NamedArgs"] : []),
                        ...params.positional.map((param) => param.typeName),
                    ].join(", ")}>`
                    : ""};`;
                code.writeln([
                    (0, builders_1.dts) `declare `,
                    (0, builders_1.t) `type ${functionTypeName}${hasParams ? `<` : ` = $.$expr_${funcopExprKind}<`}`,
                ]);
                overloadsBuf.writeln([
                    (0, builders_1.dts) `declare `,
                    (0, builders_1.t) `function ${(0, genutil_1.getRef)(funcName, { prefix: "" })}${hasParams ? "<" : (0, genutil_1.frag) `(): ${functionTypeSig}`}`,
                ]);
                const anytypes = funcDef.anytypes;
                const anytypeParams = [];
                function getParamAnytype(paramTypeName, paramType, optional) {
                    if (!anytypes)
                        return undefined;
                    if (anytypes.kind === "castable") {
                        if (paramType.name.includes("anytype") ||
                            paramType.name.includes("anypoint")) {
                            const path = (0, funcoputil_1.findPathOfAnytype)(paramType.id, types);
                            anytypeParams.push(optional
                                ? `${paramTypeName} extends $.TypeSet ? ${paramTypeName}${path} : undefined`
                                : `${paramTypeName}${path}`);
                        }
                        return anytypes.type;
                    }
                    else {
                        return anytypes.refName === paramTypeName
                            ? anytypes.type
                            : `$.getPrimitive${anytypes.type[0] === "$.NonArrayType" ? "NonArray" : ""}BaseType<${allowsLiterals(anytypes.typeObj, anytypes)
                                ? `_.castMaps.literalToTypeSet<${anytypes.refName}>`
                                : anytypes.refName}${anytypes.refPath}>`;
                    }
                }
                let hasNamedLiterals = false;
                let hasPositionalLiterals = false;
                if (hasParams) {
                    code.indented(() => {
                        overloadsBuf.indented(() => {
                            if (hasNamedParams) {
                                code.writeln([(0, builders_1.t) `NamedArgs extends {`]);
                                overloadsBuf.writeln([(0, builders_1.t) `NamedArgs extends {`]);
                                code.indented(() => {
                                    overloadsBuf.indented(() => {
                                        for (const param of params.named) {
                                            const anytype = getParamAnytype(param.typeName, param.type, param.typemod === "OptionalType" || !!param.hasDefault);
                                            const paramType = (0, generateObjectTypes_1.getStringRepresentation)(param.type, {
                                                types,
                                                anytype,
                                                casts: casts.implicitCastFromMap,
                                            });
                                            let typeStr = (0, genutil_1.frag) `$.TypeSet<${paramType.staticType}>`;
                                            if (allowsLiterals(param.type, anytypes)) {
                                                typeStr = (0, genutil_1.frag) `_.castMaps.orScalarLiteral<${typeStr}>`;
                                                hasNamedLiterals = true;
                                            }
                                            const line = (0, builders_1.t) `${(0, genutil_1.quote)(param.name)}${param.typemod === "OptionalType" || param.hasDefault
                                                ? "?"
                                                : ""}: ${typeStr},`;
                                            code.writeln([line]);
                                            overloadsBuf.writeln([line]);
                                        }
                                    });
                                });
                                code.writeln([(0, builders_1.t) `},`]);
                                overloadsBuf.writeln([(0, builders_1.t) `},`]);
                            }
                            for (const param of params.positional) {
                                const anytype = getParamAnytype(param.typeName, param.type, optionalUndefined &&
                                    (param.typemod === "OptionalType" || !!param.hasDefault));
                                const paramTypeStr = (0, generateObjectTypes_1.getStringRepresentation)(param.type, {
                                    types,
                                    anytype,
                                    casts: casts.implicitCastFromMap,
                                });
                                let type = (0, genutil_1.frag) `$.TypeSet<${paramTypeStr.staticType}>`;
                                if (allowsLiterals(param.type, anytypes)) {
                                    type = (0, genutil_1.frag) `_.castMaps.orScalarLiteral<${type}>`;
                                    hasPositionalLiterals = true;
                                }
                                const line = (0, builders_1.t) `${param.typeName} extends ${param.kind === "VariadicParam"
                                    ? (0, genutil_1.frag) `[${type}, ...${type}[]]`
                                    : type}${optionalUndefined &&
                                    (param.typemod === "OptionalType" || param.hasDefault)
                                    ? " | undefined"
                                    : ""},`;
                                code.writeln([line]);
                                overloadsBuf.writeln([line]);
                            }
                        });
                    });
                    code.writeln([(0, builders_1.t) `> = $.$expr_${funcopExprKind}<`]);
                    overloadsBuf.writeln([(0, builders_1.t) `>(`]);
                    overloadsBuf.indented(() => {
                        if (hasNamedParams) {
                            overloadsBuf.writeln([(0, builders_1.t) `namedArgs: NamedArgs,`]);
                        }
                        for (const param of params.positional) {
                            overloadsBuf.writeln([
                                (0, builders_1.t) `${param.kind === "VariadicParam" ? "..." : ""}${param.internalName}${optionalUndefined &&
                                    (param.typemod === "OptionalType" || param.hasDefault)
                                    ? "?"
                                    : ""}: ${param.typeName}${param.kind === "VariadicParam" ? "" : ","}`,
                            ]);
                        }
                    });
                    overloadsBuf.writeln([(0, builders_1.t) `): ${functionTypeSig}`]);
                }
                code.indented(() => {
                    const returnAnytype = anytypes
                        ? anytypes.kind === "castable"
                            ? anytypeParams.length <= 1
                                ? anytypeParams[0]
                                : anytypeParams.slice(1).reduce((parent, type) => {
                                    return `${anytypes.returnAnytypeWrapper}<${parent}, ${type}>`;
                                }, anytypeParams[0])
                            : `$.getPrimitive${anytypes.type[0] === "$.NonArrayType" ? "NonArray" : ""}BaseType<${allowsLiterals(anytypes.typeObj, anytypes)
                                ? `_.castMaps.literalToTypeSet<${anytypes.refName}>`
                                : anytypes.refName}${anytypes.refPath}>`
                        : undefined;
                    const returnType = (0, generateObjectTypes_1.getStringRepresentation)(types.get(funcDef.return_type.id), {
                        types,
                        anytype: returnAnytype,
                    });
                    const positionalParams = params.positional
                        .map((param) => `${param.kind === "VariadicParam" ? "..." : ""}${param.typeName}`)
                        .join(", ");
                    typeDefGen(code, funcDef, hasPositionalLiterals
                        ? (0, genutil_1.frag) `_.castMaps.mapLiteralToTypeSet<[${positionalParams}]>,`
                        : (0, genutil_1.frag) `[${positionalParams}],`, (0, genutil_1.frag) `${hasParams && hasNamedParams
                        ? hasNamedLiterals
                            ? "_.castMaps.mapLiteralToTypeSet<NamedArgs>"
                            : "NamedArgs"
                        : "{}"},`, (0, genutil_1.frag) `${returnType.staticType}, ${generateReturnCardinality(funcName, parametersToFunctionCardinality(params, hasNamedParams), funcDef.return_typemod, funcDef.preserves_optionality)}`);
                });
                code.writeln([(0, builders_1.t) `>;`]);
            }
        }
        code.writeBuf(overloadsBuf);
        code.writeln([
            (0, builders_1.r) `function ${(0, genutil_1.getRef)(funcName, { prefix: "" })}(...args`,
            (0, builders_1.ts) `: any[]`,
            (0, builders_1.r) `) {`,
        ]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.r) `const {${funcDefs[0].kind ? "kind, " : ""}returnType, cardinality, args: positionalArgs, namedArgs} = _.syntax.$resolveOverload('${funcName}', args, _.spec, [`,
            ]);
            code.indented(() => {
                let overloadIndex = 0;
                for (const funcDef of funcDefs) {
                    if (funcDef.overloadIndex !== overloadIndex) {
                        continue;
                    }
                    overloadIndex++;
                    code.writeln([(0, builders_1.r) `${generateFuncopDef(funcDef)},`]);
                }
            });
            code.writeln([(0, builders_1.r) `]);`]);
            code.writeln([(0, builders_1.r) `return _.syntax.$expressionify({`]);
            code.indented(() => {
                code.writeln([(0, builders_1.r) `__kind__: $.ExpressionKind.${funcopExprKind},`]);
                code.writeln([(0, builders_1.r) `__element__: returnType,`]);
                code.writeln([(0, builders_1.r) `__cardinality__: cardinality,`]);
                implReturnGen(code, funcName, funcDefs);
            });
            code.writeln([(0, builders_1.r) `})`, (0, builders_1.ts) ` as any`, (0, builders_1.r) `;`]);
        });
        code.writeln([(0, builders_1.r) `};`]);
        code.nl();
    }
}
function generateFuncopDef(funcopDef) {
    const { params } = funcopDef;
    function getArgSpec(param) {
        return `{typeId: ${(0, genutil_1.quote)(param.type.id)}, optional: ${(param.typemod === "OptionalType" || !!param.hasDefault).toString()}, setoftype: ${(param.typemod === "SetOfType").toString()}, variadic: ${(param.kind === "VariadicParam").toString()}}`;
    }
    const argsDef = params.positional.map((param) => {
        return getArgSpec(param);
    });
    const namedArgsDef = params.named.length
        ? `namedArgs: {${params.named
            .map((param) => {
            return `${(0, genutil_1.quote)(param.name)}: ${getArgSpec(param)}`;
        })
            .join(", ")}}, `
        : "";
    return `{${funcopDef.kind ? `kind: ${(0, genutil_1.quote)(funcopDef.kind)}, ` : ""}args: [${argsDef.join(", ")}], ${namedArgsDef}returnTypeId: ${(0, genutil_1.quote)(funcopDef.return_type.id)}${funcopDef.return_typemod === "SingletonType"
        ? ""
        : `, returnTypemod: ${(0, genutil_1.quote)(funcopDef.return_typemod)}`}${funcopDef.preserves_optionality ? `, preservesOptionality: true` : ""}}`;
}
function getReturnCardinality(name, params, returnTypemod, preservesOptionality = false) {
    if (returnTypemod === "SetOfType" &&
        name !== "std::if_else" &&
        name !== "std::assert_exists" &&
        name !== "std::union" &&
        name !== "std::coalesce" &&
        name !== "std::distinct") {
        return { type: "MANY" };
    }
    if (name === "std::union") {
        return {
            type: "MERGE",
            params: [
                { type: "PARAM", param: params[0].genTypeName },
                { type: "PARAM", param: params[1].genTypeName },
            ],
        };
    }
    if (name === "std::coalesce") {
        return {
            type: "COALESCE",
            params: [
                { type: "PARAM", param: params[0].genTypeName },
                { type: "PARAM", param: params[1].genTypeName },
            ],
        };
    }
    if (name === "std::distinct") {
        return {
            type: "IDENTITY",
            param: { type: "PARAM", param: params[0].genTypeName },
        };
    }
    if (name === "std::if_else") {
        return {
            type: "IF_ELSE",
            condition: { type: "PARAM", param: params[1].genTypeName },
            trueBranch: { type: "PARAM", param: params[0].genTypeName },
            falseBranch: { type: "PARAM", param: params[2].genTypeName },
        };
    }
    if (name === "std::assert_exists") {
        return {
            type: "OVERRIDE_LOWER",
            with: "One",
            param: {
                type: "IDENTITY",
                param: { type: "PARAM", param: params[0].genTypeName },
            },
        };
    }
    const paramCardinalities = params.map((param) => {
        if (param.typemod === "SetOfType") {
            if (preservesOptionality) {
                return {
                    type: "OVERRIDE_UPPER",
                    with: "One",
                    param: { type: "PARAM", param: param.genTypeName },
                };
            }
            else {
                return {
                    type: "ONE",
                };
            }
        }
        const type = param.typemod === "OptionalType" || param.hasDefault
            ? "OPTIONAL"
            : param.kind === "VariadicParam"
                ? "VARIADIC"
                : "PARAM";
        return { type, param: param.genTypeName };
    });
    const cardinality = paramCardinalities.length
        ? paramCardinalities.length > 1
            ? { type: "MULTIPLY", params: paramCardinalities }
            : { type: "IDENTITY", param: paramCardinalities[0] }
        : { type: "ONE" };
    return returnTypemod === "OptionalType" && !preservesOptionality
        ? { type: "OVERRIDE_LOWER", with: "Zero", param: cardinality }
        : cardinality;
}
function renderParamCardinality(card) {
    switch (card.type) {
        case "ONE": {
            return `$.Cardinality.One`;
        }
        case "OVERRIDE_UPPER": {
            return `$.cardutil.overrideUpperBound<${renderParamCardinality(card.param)}, "One">`;
        }
        case "OPTIONAL": {
            return `$.cardutil.optionalParamCardinality<${card.param}>`;
        }
        case "VARIADIC": {
            return `$.cardutil.paramArrayCardinality<${card.param}>`;
        }
        case "PARAM": {
            return `$.cardutil.paramCardinality<${card.param}>`;
        }
        case "IDENTITY": {
            return card.param;
        }
        default: {
            throw new Error(`Unknown param cardinality type: ${card.type}`);
        }
    }
}
function renderCardinality(card) {
    switch (card.type) {
        case "MANY": {
            return `$.Cardinality.Many`;
        }
        case "ONE": {
            return `$.Cardinality.One`;
        }
        case "ZERO": {
            return `$.Cardinality.Zero`;
        }
        case "MERGE": {
            const [LHS, RHS] = card.params.map(renderParamCardinality);
            return `$.cardutil.mergeCardinalities<${LHS}, ${RHS}>`;
        }
        case "COALESCE": {
            const [LHS, RHS] = card.params.map(renderParamCardinality);
            return `$.cardutil.coalesceCardinalities<${LHS}, ${RHS}>`;
        }
        case "IDENTITY": {
            return renderParamCardinality(card.param);
        }
        case "IF_ELSE": {
            return `$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<${renderParamCardinality(card.trueBranch)}, ${renderParamCardinality(card.falseBranch)}>, ${renderParamCardinality(card.condition)}>`;
        }
        case "OVERRIDE_LOWER": {
            return `$.cardutil.overrideLowerBound<${renderCardinality(card.param)}, "${card.with}">`;
        }
        case "OVERRIDE_UPPER": {
            return `$.cardutil.overrideUpperBound<${renderParamCardinality(card.param)}, "One">`;
        }
        case "MULTIPLY": {
            return card.params
                .slice(1)
                .reduce((cards, card) => `$.cardutil.multiplyCardinalities<${cards}, ${renderParamCardinality(card)}>`, renderParamCardinality(card.params[0]));
        }
        default: {
            throw new Error(`Unknown return cardinality type: ${card.type}`);
        }
    }
}
function parametersToFunctionCardinality(params, hasNamedParams) {
    return [
        ...params.positional.map((p) => ({
            ...p,
            genTypeName: p.typeName,
        })),
        ...(hasNamedParams
            ? params.named.map((p) => ({
                ...p,
                genTypeName: `NamedArgs[${(0, genutil_1.quote)(p.name)}]`,
            }))
            : []),
    ];
}
function generateReturnCardinality(name, params, returnTypemod, preservesOptionality = false) {
    const returnCard = getReturnCardinality(name, params, returnTypemod, preservesOptionality);
    return renderCardinality(returnCard);
}
