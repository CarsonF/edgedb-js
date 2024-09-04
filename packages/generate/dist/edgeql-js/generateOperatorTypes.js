"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOperatorFunctions = generateOperatorFunctions;
exports.generateOperators = generateOperators;
const debug_1 = require("debug");
const builders_1 = require("../builders");
const genutil_1 = require("../genutil");
const generateFunctionTypes_1 = require("./generateFunctionTypes");
const funcoputil_1 = require("../funcoputil");
const genutil_2 = require("../genutil");
const generateObjectTypes_1 = require("./generateObjectTypes");
function generateOperatorFunctions({ dir, operators, types, casts, }) {
    (0, generateFunctionTypes_1.generateFuncopTypes)(dir, types, casts, operators, "Operator", "OpExpr", false, (code, _opDef, _args, _namedArgs, returnType) => {
        code.writeln([(0, builders_1.t) `${returnType}`]);
    }, (code, _opName, opDefs) => {
        code.writeln([(0, builders_1.r) `__name__: ${(0, genutil_1.quote)(opDefs[0].originalName)},`]);
        code.writeln([(0, builders_1.r) `__opkind__: kind,`]);
        code.writeln([(0, builders_1.r) `__args__: positionalArgs,`]);
    });
}
const skipOperators = new Set([
    "std::index",
    "std::slice",
    "std::destructure",
]);
function operatorFromOpDef(typeToCodeFragment, opName, opDef) {
    const operatorSymbol = opName === "std::if_else"
        ? "if_else"
        : (0, genutil_1.splitName)(opDef.originalName).name.toLowerCase();
    const log = (0, debug_1.debug)(`edgedb:codegen:operatorFromOpDef:${opName}`);
    log({
        opName,
        operatorSymbol,
        returnType: opDef.return_type.name,
        returnTypeMod: opDef.return_typemod,
        anytypes: opDef.anytypes,
        positional: opDef.params.positional,
    });
    if (opName === "std::coalesce") {
        const [lhs, rhs] = opDef.params.positional;
        if (opDef.anytypes?.kind === "noncastable") {
            return {
                kind: genutil_2.OperatorKind.Infix,
                args: (0, genutil_1.frag) `infixOperandsBaseType<${typeToCodeFragment(lhs)}>`,
                returnElement: "BASE_TYPE",
                returnCardinality: "COALESCE",
                operatorSymbol,
            };
        }
        else if (opDef.anytypes?.returnAnytypeWrapper === "_.syntax.mergeObjectTypes") {
            return {
                kind: genutil_2.OperatorKind.Infix,
                args: (0, genutil_1.frag) `{ lhs: ${typeToCodeFragment(lhs)}, rhs: ${typeToCodeFragment(rhs)} }`,
                returnElement: "MERGE",
                returnCardinality: "COALESCE",
                operatorSymbol,
            };
        }
        else {
            return {
                kind: genutil_2.OperatorKind.Infix,
                args: (0, genutil_1.frag) `{ lhs: ${typeToCodeFragment(lhs)}, rhs: ${typeToCodeFragment(rhs)} }`,
                returnElement: "CONTAINER",
                returnCardinality: "COALESCE",
                operatorSymbol,
            };
        }
    }
    const anytypeIsBaseType = Boolean(opDef.anytypes?.type[0] === "$.BaseType");
    if (opDef.operator_kind === genutil_2.$.OperatorKind.Prefix) {
        const [operand] = opDef.params.positional;
        const returnCardinality = (0, generateFunctionTypes_1.getReturnCardinality)(opDef.name, [{ ...operand, genTypeName: "Operand" }], opDef.return_typemod, false);
        log({ returnCardinality });
        if (opDef.return_type.name === "std::bool") {
            return {
                kind: genutil_2.OperatorKind.Prefix,
                operand: typeToCodeFragment(operand),
                operatorSymbol,
                returnElement: "BOOLEAN",
                returnCardinality: returnCardinality.type === "IDENTITY" &&
                    returnCardinality.param.type === "ONE"
                    ? "ONE"
                    : "PARAM",
            };
        }
        else {
            return {
                kind: genutil_2.OperatorKind.Prefix,
                operand: typeToCodeFragment(operand),
                operatorSymbol,
                returnElement: "HOMOGENEOUS",
                returnCardinality: "PARAM",
            };
        }
    }
    else if (opDef.operator_kind === genutil_2.$.OperatorKind.Infix) {
        const [lhsType, rhsType] = opDef.params.positional;
        const getArgsFromAnytypes = () => {
            if (opDef.anytypes && opDef.anytypes.kind === "noncastable") {
                if (opDef.anytypes.typeObj.kind === "range") {
                    return (0, genutil_1.frag) `infixOperandsRangeType<${typeToCodeFragment(lhsType)}>`;
                }
                else if (opDef.anytypes.typeObj.kind === "multirange") {
                    return (0, genutil_1.frag) `infixOperandsMultiRangeType<${typeToCodeFragment(lhsType)}>`;
                }
                else if (opDef.anytypes.typeObj.kind === "array") {
                    return (0, genutil_1.frag) `infixOperandsArrayTypeNonArray<${typeToCodeFragment(lhsType)}>`;
                }
                else if (opDef.anytypes.typeObj.kind === "unknown") {
                    return (0, genutil_1.frag) `infixOperandsBaseType<${typeToCodeFragment(lhsType)}>`;
                }
            }
            return (0, genutil_1.frag) `{ lhs: ${typeToCodeFragment(lhsType)}; rhs: ${typeToCodeFragment(rhsType)} }`;
        };
        const _returnCardinality = (0, generateFunctionTypes_1.getReturnCardinality)(opDef.name, [
            { ...lhsType, genTypeName: "LHS" },
            { ...rhsType, genTypeName: "RHS" },
        ], opDef.return_typemod, false);
        if (opDef.return_type.name === "std::bool") {
            const returnCardinality = _returnCardinality.type === "MULTIPLY"
                ? _returnCardinality.params.every((p) => p.type === "OPTIONAL")
                    ? "MULTIPLY_OPTIONAL"
                    : _returnCardinality.params[1].type === "ONE"
                        ? "MULTIPLY_ONE"
                        : "MULTIPLY"
                : "MULTIPLY";
            if (lhsType.type.kind === "scalar") {
                return {
                    kind: genutil_2.OperatorKind.Infix,
                    args: (0, genutil_1.frag) `{ lhs: ${typeToCodeFragment(lhsType)}, rhs: ${typeToCodeFragment(rhsType)} }`,
                    operatorSymbol,
                    returnElement: "BOOLEAN",
                    returnCardinality,
                };
            }
            else {
                return {
                    kind: genutil_2.OperatorKind.Infix,
                    args: getArgsFromAnytypes(),
                    operatorSymbol,
                    returnElement: "BOOLEAN",
                    returnCardinality,
                };
            }
        }
        if (lhsType.type.kind === "scalar") {
            return {
                kind: genutil_2.OperatorKind.Infix,
                args: getArgsFromAnytypes(),
                operatorSymbol,
                returnElement: "SCALAR",
                returnCardinality: "MULTIPLY",
            };
        }
        else {
            if (opDef.anytypes) {
                if (opDef.return_type.name === "array<anytype>") {
                    if (opDef.anytypes.kind === "castable" &&
                        opDef.anytypes.returnAnytypeWrapper === "_.syntax.mergeObjectTypes") {
                        return {
                            kind: genutil_2.OperatorKind.Infix,
                            args: getArgsFromAnytypes(),
                            operatorSymbol,
                            returnElement: "OBJECT_ARRAY_TYPE",
                            returnCardinality: "MULTIPLY",
                        };
                    }
                    return {
                        kind: genutil_2.OperatorKind.Infix,
                        args: getArgsFromAnytypes(),
                        operatorSymbol,
                        returnElement: "ARRAY_TYPE",
                        returnCardinality: "MULTIPLY",
                    };
                }
                if (opDef.anytypes.kind === "noncastable") {
                    if (opDef.anytypes.typeObj.kind === "range") {
                        return {
                            kind: genutil_2.OperatorKind.Infix,
                            args: getArgsFromAnytypes(),
                            operatorSymbol,
                            returnElement: "RANGE_TYPE",
                            returnCardinality: "MULTIPLY",
                        };
                    }
                    else if (opDef.anytypes.typeObj.kind === "multirange") {
                        return {
                            kind: genutil_2.OperatorKind.Infix,
                            args: getArgsFromAnytypes(),
                            operatorSymbol,
                            returnElement: "MULTI_RANGE_TYPE",
                            returnCardinality: "MULTIPLY",
                        };
                    }
                    else if (opDef.anytypes.typeObj.kind === "unknown") {
                        const returnCardinality = _returnCardinality.type === "MERGE" ? "MERGE" : "MULTIPLY_ONE";
                        return {
                            kind: genutil_2.OperatorKind.Infix,
                            args: getArgsFromAnytypes(),
                            operatorSymbol,
                            returnElement: "BASE_TYPE",
                            returnCardinality,
                        };
                    }
                    else {
                        throw new Error(`Unexpected anytype in container homogeneous operator defintion: ${JSON.stringify(opDef, null, 2)}`);
                    }
                }
                else {
                    if (opDef.anytypes.returnAnytypeWrapper === "_.syntax.mergeObjectTypes") {
                        return {
                            kind: genutil_2.OperatorKind.Infix,
                            args: getArgsFromAnytypes(),
                            operatorSymbol,
                            returnElement: "MERGE",
                            returnCardinality: _returnCardinality.type === "MANY" ? "MANY" : "MERGE",
                        };
                    }
                }
            }
            return {
                kind: genutil_2.OperatorKind.Infix,
                args: getArgsFromAnytypes(),
                operatorSymbol,
                returnElement: "CONTAINER",
                returnCardinality: "MULTIPLY",
            };
        }
    }
    else if (opDef.operator_kind === genutil_2.$.OperatorKind.Ternary) {
        const [lhs, _cond, rhs] = opDef.params.positional;
        if (anytypeIsBaseType) {
            return {
                kind: genutil_2.OperatorKind.Ternary,
                args: (0, genutil_1.frag) `infixOperandsBaseType<${typeToCodeFragment(lhs)}>`,
                operatorSymbol,
                returnElement: "BASE_TYPE",
            };
        }
        if (opDef.anytypes?.kind === "castable" &&
            opDef.anytypes.returnAnytypeWrapper === "_.syntax.mergeObjectTypes") {
            return {
                kind: genutil_2.OperatorKind.Ternary,
                args: (0, genutil_1.frag) `{ lhs: ${typeToCodeFragment(lhs)}, rhs: ${typeToCodeFragment(rhs)} }`,
                operatorSymbol,
                returnElement: "MERGE",
            };
        }
        return {
            kind: genutil_2.OperatorKind.Ternary,
            args: (0, genutil_1.frag) `{ lhs: ${typeToCodeFragment(lhs)}, rhs: ${typeToCodeFragment(rhs)} }`,
            operatorSymbol,
            returnElement: "CONTAINER",
        };
    }
    else {
        throw new Error(`Unknown operator kind: ${opDef.operator_kind}`);
    }
}
function generateOperators({ dir, operators, types, casts, }) {
    const typeSpecificities = (0, funcoputil_1.getTypesSpecificity)(types, casts);
    const implicitCastableRootTypes = (0, funcoputil_1.getImplicitCastableRootTypes)(casts);
    const code = dir.getPath("operators");
    code.addImportStar("$", "./reflection", { allowFileExt: true });
    code.addImportStar("_", "./imports", { allowFileExt: true });
    const overloadsBuf = new builders_1.CodeBuffer();
    const overloadDefs = {};
    for (const opKind of Object.values(genutil_2.$.OperatorKind)) {
        overloadDefs[opKind] = {};
    }
    const prefixBooleanDefs = new genutil_2.StrictMapSet();
    const prefixBooleanOneDefs = new genutil_2.StrictMapSet();
    const prefixHomogeneousDefs = new genutil_2.StrictMapSet();
    const infixBooleanMultiplyDefs = new genutil_2.StrictMapSet();
    const infixBooleanMultiplyOptionalDefs = new genutil_2.StrictMapSet();
    const infixBooleanMultiplyOneDefs = new genutil_2.StrictMapSet();
    const infixScalarMultiplyDefs = new genutil_2.StrictMapSet();
    const infixContainerMultiplyDefs = new genutil_2.StrictMapSet();
    const infixRangeTypeMultiplyDefs = new genutil_2.StrictMapSet();
    const infixMultiRangeTypeMultiplyDefs = new genutil_2.StrictMapSet();
    const infixArrayTypeMultiplyDefs = new genutil_2.StrictMapSet();
    const infixObjectArrayTypeMultiplyDefs = new genutil_2.StrictMapSet();
    const infixBaseTypeMultiplyOneDefs = new genutil_2.StrictMapSet();
    const infixBaseTypeMergeDefs = new genutil_2.StrictMapSet();
    const infixMergeDefs = new genutil_2.StrictMapSet();
    const infixMergeManyDefs = new genutil_2.StrictMapSet();
    const infixCoalesceContainerDefs = new genutil_2.StrictMapSet();
    const infixCoalesceBaseTypeDefs = new genutil_2.StrictMapSet();
    const infixCoalesceObjectDefs = new genutil_2.StrictMapSet();
    const ternaryContainerDefs = new genutil_2.StrictMapSet();
    const ternaryBaseTypeDefs = new genutil_2.StrictMapSet();
    const ternaryMergeDefs = new genutil_2.StrictMapSet();
    for (const [opName, _opDefs] of operators.entries()) {
        if (skipOperators.has(opName))
            continue;
        const log = (0, debug_1.debug)(`edgedb:codegen:generateOperators:${opName}`);
        log(_opDefs.map((opDef) => ({
            return_type: opDef.return_type,
            return_typemod: opDef.return_typemod,
            params0: opDef.params[0].type,
            params0_typemod: opDef.params[0].typemod,
            params1: opDef.params[1]?.type,
            params1_typemod: opDef.params[1]?.typemod,
            params2: opDef.params[2]?.type,
            params2_typemod: opDef.params[2]?.typemod,
        })));
        const opDefs = (0, funcoputil_1.expandFuncopAnytypeOverloads)((0, funcoputil_1.sortFuncopOverloads)(_opDefs, typeSpecificities), types, casts, implicitCastableRootTypes);
        let overloadIndex = 0;
        for (const opDef of opDefs) {
            const opSymbol = opName === "std::if_else"
                ? "if_else"
                : (0, genutil_1.splitName)(opDef.originalName).name.toLowerCase();
            if (opDef.overloadIndex === overloadIndex) {
                if (!overloadDefs[opDef.operator_kind][opSymbol]) {
                    overloadDefs[opDef.operator_kind][opSymbol] = [];
                }
                overloadDefs[opDef.operator_kind][opSymbol].push((0, generateFunctionTypes_1.generateFuncopDef)(opDef));
                overloadIndex++;
            }
            const anytypes = opDef.anytypes;
            const anytypeParams = [];
            const getParamType = (param) => {
                const getParamAnytype = (paramTypeName, paramType) => {
                    if (!anytypes)
                        return undefined;
                    if (anytypes.kind === "castable") {
                        if (paramType.name.includes("anytype")) {
                            const path = (0, funcoputil_1.findPathOfAnytype)(paramType.id, types);
                            anytypeParams.push(`${paramTypeName}${path}`);
                        }
                        return anytypes.type;
                    }
                    else {
                        return anytypes.refName === paramTypeName
                            ? anytypes.type
                            : `$.getPrimitive${anytypes.type[0] === "$.NonArrayType" ? "NonArray" : ""}BaseType<${(0, generateFunctionTypes_1.allowsLiterals)(anytypes.typeObj, anytypes)
                                ? `_.castMaps.literalToTypeSet<${anytypes.refName}>`
                                : anytypes.refName}${anytypes.refPath}>`;
                    }
                };
                const anytype = getParamAnytype(param.typeName, param.type);
                const paramTypeStr = (0, generateObjectTypes_1.getStringRepresentation)(param.type, {
                    types,
                    anytype,
                    casts: casts.implicitCastFromMap,
                });
                let type = (0, genutil_1.frag) `$.TypeSet<${paramTypeStr.staticType}>`;
                if ((0, generateFunctionTypes_1.allowsLiterals)(param.type, anytypes)) {
                    type = (0, genutil_1.frag) `_.castMaps.orScalarLiteral<${type}>`;
                }
                return type;
            };
            const operator = operatorFromOpDef(getParamType, opName, opDef);
            const mapFromOperator = (operator) => {
                switch (operator.kind) {
                    case genutil_2.OperatorKind.Prefix:
                        if (operator.returnElement === "BOOLEAN") {
                            if (operator.returnCardinality === "ONE") {
                                return prefixBooleanOneDefs;
                            }
                            else if (operator.returnCardinality === "PARAM") {
                                return prefixBooleanDefs;
                            }
                        }
                        else {
                            return prefixHomogeneousDefs;
                        }
                        throw new Error(`Unsupported prefix operator: ${opName}: ${operator.returnElement} * ${operator.returnCardinality}`);
                    case genutil_2.OperatorKind.Infix:
                        if (operator.returnElement === "BOOLEAN") {
                            if (operator.returnCardinality === "MULTIPLY") {
                                return infixBooleanMultiplyDefs;
                            }
                            else if (operator.returnCardinality === "MULTIPLY_OPTIONAL") {
                                return infixBooleanMultiplyOptionalDefs;
                            }
                            else {
                                return infixBooleanMultiplyOneDefs;
                            }
                        }
                        else if (operator.returnElement === "SCALAR") {
                            return infixScalarMultiplyDefs;
                        }
                        else if (operator.returnElement === "RANGE_TYPE") {
                            return infixRangeTypeMultiplyDefs;
                        }
                        else if (operator.returnElement === "MULTI_RANGE_TYPE") {
                            return infixMultiRangeTypeMultiplyDefs;
                        }
                        else if (operator.returnElement === "ARRAY_TYPE") {
                            return infixArrayTypeMultiplyDefs;
                        }
                        else if (operator.returnElement === "OBJECT_ARRAY_TYPE") {
                            return infixObjectArrayTypeMultiplyDefs;
                        }
                        else if (operator.returnElement === "BASE_TYPE") {
                            if (operator.returnCardinality === "MULTIPLY_ONE") {
                                return infixBaseTypeMultiplyOneDefs;
                            }
                            else if (operator.returnCardinality === "MERGE") {
                                return infixBaseTypeMergeDefs;
                            }
                            else if (operator.returnCardinality === "COALESCE") {
                                return infixCoalesceBaseTypeDefs;
                            }
                        }
                        else if (operator.returnElement === "MERGE") {
                            if (operator.returnCardinality === "MERGE") {
                                return infixMergeDefs;
                            }
                            else if (operator.returnCardinality === "MANY") {
                                return infixMergeManyDefs;
                            }
                            else if (operator.returnCardinality === "COALESCE") {
                                return infixCoalesceObjectDefs;
                            }
                        }
                        else if (operator.returnElement === "CONTAINER") {
                            if (operator.returnCardinality === "MULTIPLY") {
                                return infixContainerMultiplyDefs;
                            }
                            else if (operator.returnCardinality === "COALESCE") {
                                return infixCoalesceContainerDefs;
                            }
                        }
                        throw new Error(`Unsupported infix operator: ${opName}: ${operator.returnElement} * ${operator.returnCardinality}`);
                    case genutil_2.OperatorKind.Ternary:
                        if (operator.returnElement === "CONTAINER") {
                            return ternaryContainerDefs;
                        }
                        else if (operator.returnElement === "BASE_TYPE") {
                            return ternaryBaseTypeDefs;
                        }
                        else if (operator.returnElement === "MERGE") {
                            return ternaryMergeDefs;
                        }
                        throw new Error(`Unsupported ternary operator: ${opName}: ${operator.returnElement} * ${operator.returnCardinality}`);
                    default:
                        throw new Error(`Unsupported operator kind: ${opName}: ${operator.kind}`);
                }
            };
            const map = mapFromOperator(operator);
            map.appendAt(opSymbol, operator);
        }
    }
    overloadsBuf.writeln([
        (0, builders_1.t) `interface infixOperandsBaseType<LHS extends _.castMaps.orScalarLiteral<$.TypeSet<$.BaseType>>> {`,
    ]);
    overloadsBuf.indented(() => {
        overloadsBuf.writeln([(0, builders_1.t) `lhs: LHS;`]);
        overloadsBuf.writeln([
            (0, builders_1.t) `rhs: _.castMaps.orScalarLiteral<$.TypeSet<$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>>>;`,
        ]);
    });
    overloadsBuf.writeln([(0, builders_1.t) `}`]);
    overloadsBuf.nl();
    overloadsBuf.writeln([
        (0, builders_1.t) `interface infixOperandsRangeType<LHS extends $.TypeSet<$.RangeType<_std.$anypoint>>> {`,
    ]);
    overloadsBuf.indented(() => {
        overloadsBuf.writeln([(0, builders_1.t) `lhs: LHS;`]);
        overloadsBuf.writeln([
            (0, builders_1.t) `rhs: $.TypeSet<$.RangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>>;`,
        ]);
    });
    overloadsBuf.writeln([(0, builders_1.t) `}`]);
    overloadsBuf.nl();
    overloadsBuf.writeln([
        (0, builders_1.t) `interface infixOperandsMultiRangeType<LHS extends $.TypeSet<$.MultiRangeType<_std.$anypoint>>> {`,
    ]);
    overloadsBuf.indented(() => {
        overloadsBuf.writeln([(0, builders_1.t) `lhs: LHS;`]);
        overloadsBuf.writeln([
            (0, builders_1.t) `rhs: $.TypeSet<$.MultiRangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>>;`,
        ]);
    });
    overloadsBuf.writeln([(0, builders_1.t) `}`]);
    overloadsBuf.nl();
    overloadsBuf.writeln([
        (0, builders_1.t) `interface infixOperandsArrayTypeNonArray<LHS extends $.TypeSet<$.ArrayType<$.NonArrayType>>> {`,
    ]);
    overloadsBuf.indented(() => {
        overloadsBuf.writeln([(0, builders_1.t) `lhs: LHS;`]);
        overloadsBuf.writeln([
            (0, builders_1.t) `rhs: $.TypeSet<$.ArrayType<$.getPrimitiveNonArrayBaseType<LHS["__element__"]["__element__"]>>>;`,
        ]);
    });
    overloadsBuf.writeln([(0, builders_1.t) `}`]);
    overloadsBuf.nl();
    if (prefixBooleanDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface PrefixBooleanOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of prefixBooleanDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| { operand: ${def.operand}}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (prefixBooleanOneDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface PrefixBooleanOneOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of prefixBooleanOneDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| { operand: ${def.operand}}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (prefixHomogeneousDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface PrefixHomogeneousOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of prefixHomogeneousDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| { operand: ${def.operand} }`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixBooleanMultiplyDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixBooleanMultiplyOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixBooleanMultiplyDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixBooleanMultiplyOptionalDefs.size > 0) {
        overloadsBuf.writeln([
            (0, builders_1.t) `interface InfixBooleanMultiplyOptionalOperators {`,
        ]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs,] of infixBooleanMultiplyOptionalDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixBooleanMultiplyOneDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixBooleanMultiplyOneOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixBooleanMultiplyOneDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixScalarMultiplyDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixScalarMultiplyOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixScalarMultiplyDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixContainerMultiplyDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixContainerMultiplyOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixContainerMultiplyDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixRangeTypeMultiplyDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixRangeTypeMultiplyOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixRangeTypeMultiplyDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixMultiRangeTypeMultiplyDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixMultiRangeTypeMultiplyOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs,] of infixMultiRangeTypeMultiplyDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixArrayTypeMultiplyDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixArrayTypeMultiplyOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixArrayTypeMultiplyDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixObjectArrayTypeMultiplyDefs.size > 0) {
        overloadsBuf.writeln([
            (0, builders_1.t) `interface InfixObjectArrayTypeMultiplyOperators {`,
        ]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs,] of infixObjectArrayTypeMultiplyDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixBaseTypeMultiplyOneDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixBaseTypeMultiplyOneOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixBaseTypeMultiplyOneDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixBaseTypeMergeDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixBaseTypeMergeOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixBaseTypeMergeDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixMergeDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixMergeOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixMergeDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixMergeManyDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixMergeManyOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixMergeManyDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixCoalesceContainerDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixCoalesceContainerOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixCoalesceContainerDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixCoalesceBaseTypeDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixCoalesceBaseTypeOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixCoalesceBaseTypeDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (infixCoalesceObjectDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface InfixCoalesceObjectOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of infixCoalesceObjectDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (ternaryContainerDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface TernaryContainerOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of ternaryContainerDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (ternaryBaseTypeDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface TernaryBaseTypeOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of ternaryBaseTypeDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    if (ternaryMergeDefs.size > 0) {
        overloadsBuf.writeln([(0, builders_1.t) `interface TernaryMergeOperators {`]);
        overloadsBuf.indented(() => {
            for (const [opSymbol, defs] of ternaryMergeDefs.entries()) {
                overloadsBuf.writeln([(0, builders_1.t) `${(0, genutil_1.quote)(opSymbol)}: `]);
                overloadsBuf.indented(() => {
                    for (const def of defs) {
                        overloadsBuf.writeln([(0, builders_1.t) `| ${def.args}`]);
                    }
                });
            }
        });
        overloadsBuf.writeln([(0, builders_1.t) `}`]);
        overloadsBuf.nl();
    }
    code.writeln([
        (0, builders_1.r) `const overloadDefs`,
        (0, builders_1.ts) `: {
  [opKind in 'Infix' | 'Prefix' | 'Postfix' | 'Ternary']: {
    [opSymbol: string]: any[]
  }
}`,
        (0, builders_1.r) ` = {`,
    ]);
    code.indented(() => {
        for (const opKind of Object.keys(overloadDefs)) {
            code.writeln([(0, builders_1.r) `${opKind}: {`]);
            code.indented(() => {
                for (const symbol of Object.keys(overloadDefs[opKind])) {
                    code.writeln([(0, builders_1.r) `${(0, genutil_1.quote)(symbol)}: [`]);
                    code.indented(() => {
                        for (const overloadDef of overloadDefs[opKind][symbol]) {
                            code.writeln([(0, builders_1.r) `${overloadDef},`]);
                        }
                    });
                    code.writeln([(0, builders_1.r) `],`]);
                }
            });
            code.writeln([(0, builders_1.r) `},`]);
        }
    });
    code.writeln([(0, builders_1.r) `};`]);
    code.nl();
    code.writeBuf(overloadsBuf);
    code.nl();
    code.writeln([(0, builders_1.t) `type ExtractRHS<T, LHS> =`]);
    code.indented(() => {
        code.writeln([
            (0, builders_1.t) `T extends { lhs: infer LHSType; rhs: infer RHSType } ? LHS extends LHSType ? RHSType : never : never;`,
        ]);
    });
    code.nl();
    if (infixBooleanMultiplyDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixBooleanMultiplyOperators,`]);
            code.writeln([(0, builders_1.t) `LHS extends InfixBooleanMultiplyOperators[Op]["lhs"],`]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixBooleanMultiplyOperators[Op], LHS>,`,
            ]);
            code.writeln([(0, builders_1.t) `Element extends _std.$bool,`]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>,`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixBooleanMultiplyOptionalDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `Op extends keyof InfixBooleanMultiplyOptionalOperators,`,
            ]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixBooleanMultiplyOptionalOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixBooleanMultiplyOptionalOperators[Op], LHS>,`,
            ]);
            code.writeln([(0, builders_1.t) `Element extends _std.$bool,`]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.optionalParamCardinality<LHS>, $.cardutil.optionalParamCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixBooleanMultiplyOneDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixBooleanMultiplyOneOperators,`]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixBooleanMultiplyOneOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixBooleanMultiplyOneOperators[Op], LHS>,`,
            ]);
            code.writeln([(0, builders_1.t) `Element extends _std.$bool,`]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.Cardinality.One>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (prefixBooleanDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof PrefixBooleanOperators,`]);
            code.writeln([(0, builders_1.t) `Operand extends PrefixBooleanOperators[Op]["operand"],`]);
        });
        code.writeln([
            (0, builders_1.t) `>(op: Op, operand: Operand): $.$expr_Operator<_std.$bool, $.cardutil.paramCardinality<Operand>>;`,
        ]);
        code.nl();
    }
    if (prefixBooleanOneDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof PrefixBooleanOneOperators,`]);
            code.writeln([
                (0, builders_1.t) `Operand extends PrefixBooleanOneOperators[Op]["operand"],`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(op: Op, operand: Operand): $.$expr_Operator<_std.$bool, $.Cardinality.One>;`,
        ]);
        code.nl();
    }
    if (prefixHomogeneousDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof PrefixHomogeneousOperators,`]);
            code.writeln([
                (0, builders_1.t) `Operand extends PrefixHomogeneousOperators[Op]["operand"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends _.castMaps.literalToTypeSet<Operand>["__element__"],`,
            ]);
            code.writeln([(0, builders_1.t) `Card extends $.cardutil.paramCardinality<Operand>`]);
        });
        code.writeln([
            (0, builders_1.t) `>(op: Op, operand: Operand): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixScalarMultiplyDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixScalarMultiplyOperators,`]);
            code.writeln([(0, builders_1.t) `LHS extends InfixScalarMultiplyOperators[Op]["lhs"],`]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixScalarMultiplyOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends $.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>,`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixCoalesceBaseTypeDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixCoalesceBaseTypeOperators,`]);
            code.writeln([(0, builders_1.t) `LHS extends InfixCoalesceBaseTypeOperators[Op]["lhs"],`]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixCoalesceBaseTypeOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends $.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.coalesceCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixCoalesceContainerDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixCoalesceContainerOperators,`]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixCoalesceContainerOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixCoalesceContainerOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends _.syntax.getSharedParentPrimitive<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.coalesceCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixCoalesceObjectDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixCoalesceObjectOperators,`]);
            code.writeln([(0, builders_1.t) `LHS extends InfixCoalesceObjectOperators[Op]["lhs"],`]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixCoalesceObjectOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends _.syntax.mergeObjectTypes<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.coalesceCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixContainerMultiplyDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixContainerMultiplyOperators,`]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixContainerMultiplyOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixContainerMultiplyOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends _.syntax.getSharedParentPrimitive<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixRangeTypeMultiplyDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixRangeTypeMultiplyOperators,`]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixRangeTypeMultiplyOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixRangeTypeMultiplyOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends $.RangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixMultiRangeTypeMultiplyDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixMultiRangeTypeMultiplyOperators,`]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixMultiRangeTypeMultiplyOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixMultiRangeTypeMultiplyOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends $.MultiRangeType<$.getPrimitiveBaseType<LHS["__element__"]["__element__"]>>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixArrayTypeMultiplyDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixArrayTypeMultiplyOperators,`]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixArrayTypeMultiplyOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixArrayTypeMultiplyOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends $.ArrayType<_.syntax.getSharedParentPrimitive<LHS["__element__"]["__element__"], RHS["__element__"]["__element__"]>>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixObjectArrayTypeMultiplyDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `Op extends keyof InfixObjectArrayTypeMultiplyOperators,`,
            ]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixObjectArrayTypeMultiplyOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixObjectArrayTypeMultiplyOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends $.ArrayType<_.syntax.mergeObjectTypes<LHS["__element__"]["__element__"], RHS["__element__"]["__element__"]>>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixBaseTypeMultiplyOneDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixBaseTypeMultiplyOneOperators,`]);
            code.writeln([
                (0, builders_1.t) `LHS extends InfixBaseTypeMultiplyOneOperators[Op]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixBaseTypeMultiplyOneOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends $.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.multiplyCardinalities<$.cardutil.paramCardinality<LHS>, $.Cardinality.One>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixBaseTypeMergeDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixBaseTypeMergeOperators,`]);
            code.writeln([(0, builders_1.t) `LHS extends InfixBaseTypeMergeOperators[Op]["lhs"],`]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixBaseTypeMergeOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends $.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.mergeCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixMergeDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixMergeOperators,`]);
            code.writeln([(0, builders_1.t) `LHS extends InfixMergeOperators[Op]["lhs"],`]);
            code.writeln([(0, builders_1.t) `RHS extends ExtractRHS<InfixMergeOperators[Op], LHS>,`]);
            code.writeln([
                (0, builders_1.t) `Element extends _.syntax.mergeObjectTypes<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Card extends $.cardutil.mergeCardinalities<$.cardutil.paramCardinality<LHS>, $.cardutil.paramCardinality<RHS>>`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (infixMergeManyDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([(0, builders_1.t) `Op extends keyof InfixMergeManyOperators,`]);
            code.writeln([(0, builders_1.t) `LHS extends InfixMergeManyOperators[Op]["lhs"],`]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<InfixMergeManyOperators[Op], LHS>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `Element extends _.syntax.mergeObjectTypes<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([(0, builders_1.t) `Card extends $.Cardinality.Many`]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op: Op, rhs: RHS): $.$expr_Operator<Element, Card>;`,
        ]);
        code.nl();
    }
    if (ternaryContainerDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `LHS extends TernaryContainerOperators["if_else"]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<TernaryContainerOperators["if_else"], LHS>,`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op1: "if", cond: Cond, op2: "else", rhs: RHS): $.$expr_Operator<`,
        ]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `_.syntax.getSharedParentPrimitive<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS> , $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>>`,
            ]);
        });
        code.writeln([(0, builders_1.t) `>;`]);
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `LHS extends TernaryContainerOperators["if_else"]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<TernaryContainerOperators["if_else"], LHS>,`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(op1: "if", cond: Cond, op2: "then", lhs: LHS, op3: "else", rhs: RHS): $.$expr_Operator<`,
        ]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `_.syntax.getSharedParentPrimitive<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS> , $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>>`,
            ]);
        });
        code.writeln([(0, builders_1.t) `>;`]);
        code.nl();
    }
    if (ternaryBaseTypeDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `LHS extends TernaryBaseTypeOperators["if_else"]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<TernaryBaseTypeOperators["if_else"], LHS>,`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op1: "if", cond: Cond, op2: "else", rhs: RHS): $.$expr_Operator<`,
        ]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS> , $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>>`,
            ]);
        });
        code.writeln([(0, builders_1.t) `>;`]);
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `LHS extends TernaryBaseTypeOperators["if_else"]["lhs"],`,
            ]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<TernaryBaseTypeOperators["if_else"], LHS>,`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(op1: "if", cond: Cond, op2: "then", lhs: LHS, op3: "else", rhs: RHS): $.$expr_Operator<`,
        ]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `$.getPrimitiveBaseType<_.castMaps.literalToTypeSet<LHS>["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS> , $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>>`,
            ]);
        });
        code.writeln([(0, builders_1.t) `>;`]);
        code.nl();
    }
    if (ternaryMergeDefs.size > 0) {
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
            ]);
            code.writeln([(0, builders_1.t) `LHS extends TernaryMergeOperators["if_else"]["lhs"],`]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<TernaryMergeOperators["if_else"], LHS>,`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(lhs: LHS, op1: "if", cond: Cond, op2: "else", rhs: RHS): $.$expr_Operator<`,
        ]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `_.syntax.mergeObjectTypes<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS> , $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>>`,
            ]);
        });
        code.writeln([(0, builders_1.t) `>;`]);
        code.writeln([(0, builders_1.t) `function op<`]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `Cond extends _.castMaps.orScalarLiteral<$.TypeSet<_std.$bool>>,`,
            ]);
            code.writeln([(0, builders_1.t) `LHS extends TernaryMergeOperators["if_else"]["lhs"],`]);
            code.writeln([
                (0, builders_1.t) `RHS extends ExtractRHS<TernaryMergeOperators["if_else"], LHS>,`,
            ]);
        });
        code.writeln([
            (0, builders_1.t) `>(op1: "if", cond: Cond, op2: "then", lhs: LHS, op3: "else", rhs: RHS): $.$expr_Operator<`,
        ]);
        code.indented(() => {
            code.writeln([
                (0, builders_1.t) `_.syntax.mergeObjectTypes<LHS["__element__"], RHS["__element__"]>,`,
            ]);
            code.writeln([
                (0, builders_1.t) `$.cardutil.multiplyCardinalities<$.cardutil.orCardinalities<$.cardutil.paramCardinality<LHS> , $.cardutil.paramCardinality<RHS>>, $.cardutil.paramCardinality<Cond>>`,
            ]);
        });
        code.writeln([(0, builders_1.t) `>;`]);
        code.nl();
    }
    code.writeln([(0, builders_1.r) `function op(...args`, (0, builders_1.ts) `: any[]`, (0, builders_1.r) `) {`]);
    code.indented(() => {
        code.writeln([
            (0, builders_1.r) `let op`,
            (0, builders_1.ts) `: string`,
            (0, builders_1.r) ` = "";
  let params`,
            (0, builders_1.ts) `: any[]`,
            (0, builders_1.r) ` = [];
  let defs`,
            (0, builders_1.ts) `: any[] | null | undefined`,
            (0, builders_1.r) ` = null;
  if (args.length === 2) {
    if (typeof args[0] === "string" && overloadDefs.Prefix[args[0]]) {
      op = args[0];
      params = [args[1]];
      defs = overloadDefs.Prefix[op];
    } else if (typeof args[1] === "string" && overloadDefs.Postfix[args[1]]) {
      op = args[1];
      params = [args[0]];
      defs = overloadDefs.Postfix[op];
    }
  } else if (args.length === 3) {
    if (typeof args[1] === "string") {
      op = args[1];
      params = [args[0], args[2]];
      defs = overloadDefs.Infix[op];
    }
  } else if (args.length === 5) {
    if (typeof args[1] === "string" && typeof args[3] === "string") {
      // Python-style if-else
      op = \`\${args[1]}_\${args[3]}\`;
      params = [args[0], args[2], args[4]];
      defs = overloadDefs.Ternary[op];
    }
  } else if (args.length === 6) {
    // Functional-style if-then-else
    if (typeof args[0] === "string" && typeof args[2] === "string" && typeof args[4] === "string") {
      op = \`\${args[0]}_\${args[4]}\`;
      params = [args[3], args[1], args[5]];
      defs = overloadDefs.Ternary[op];
    }
  }

  if (!defs) {
    throw new Error(\`No operator exists with signature: \${args.map(arg => \`\${arg}\`).join(", ")}\`);
  }`,
        ]);
        code.nl();
        code.writeln([
            (0, builders_1.r) `const {kind, returnType, cardinality, args: resolvedArgs} = _.syntax.$resolveOverload(op, params, _.spec, defs);`,
        ]);
        code.nl();
        code.writeln([(0, builders_1.r) `return _.syntax.$expressionify({`]);
        code.indented(() => {
            code.writeln([(0, builders_1.r) `__kind__: $.ExpressionKind.Operator,`]);
            code.writeln([(0, builders_1.r) `__element__: returnType,`]);
            code.writeln([(0, builders_1.r) `__cardinality__: cardinality,`]);
            code.writeln([(0, builders_1.r) `__name__: op,`]);
            code.writeln([(0, builders_1.r) `__opkind__: kind,`]);
            code.writeln([(0, builders_1.r) `__args__: resolvedArgs,`]);
        });
        code.writeln([(0, builders_1.r) `})`, (0, builders_1.ts) ` as any`, (0, builders_1.r) `;`]);
    });
    code.writeln([(0, builders_1.r) `};`]);
    code.addExport("op");
}
