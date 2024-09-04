import type { GeneratorParams } from "../genutil";
import type { CodeBuilder, CodeFragment, DirBuilder } from "../builders";
import type { $ } from "../genutil";
import type { AnytypeDef, FuncopDefOverload } from "../funcoputil";
export declare const generateFunctionTypes: ({ dir, functions, types, casts, }: GeneratorParams) => void;
export declare function allowsLiterals(type: $.introspect.Type, anytypes: AnytypeDef | null): boolean;
export interface FuncopDef {
    id: string;
    name: string;
    kind?: string;
    description?: string;
    return_type: {
        id: string;
        name: string;
    };
    return_typemod: $.introspect.FuncopTypemod;
    params: $.introspect.FuncopParam[];
    preserves_optionality?: boolean;
}
export declare function generateFuncopTypes<F extends FuncopDef>(dir: DirBuilder, types: $.introspect.Types, casts: $.introspect.Casts, funcops: $.StrictMap<string, F[]>, funcopExprKind: string, typeDefSuffix: string, optionalUndefined: boolean, typeDefGen: (code: CodeBuilder, def: F, args: CodeFragment[], namedArgs: CodeFragment[], returnType: CodeFragment[]) => void, implReturnGen: (code: CodeBuilder, funcopName: string, funcopDefs: F[]) => void): void;
export declare function generateFuncopDef(funcopDef: FuncopDefOverload<FuncopDef>): string;
type ParamCardinality = {
    type: "ONE";
} | {
    type: "OVERRIDE_UPPER";
    with: "One";
    param: ParamCardinality;
} | {
    type: "OPTIONAL";
    param: string;
} | {
    type: "VARIADIC";
    param: string;
} | {
    type: "PARAM";
    param: string;
} | {
    type: "IDENTITY";
    param: string;
};
type ReturnCardinality = {
    type: "MANY";
} | {
    type: "ONE";
} | {
    type: "ZERO";
} | {
    type: "MERGE";
    params: [ParamCardinality, ParamCardinality];
} | {
    type: "COALESCE";
    params: [ParamCardinality, ParamCardinality];
} | {
    type: "IF_ELSE";
    condition: ParamCardinality;
    trueBranch: ParamCardinality;
    falseBranch: ParamCardinality;
} | {
    type: "OVERRIDE_LOWER";
    with: "One" | "Zero";
    param: ReturnCardinality;
} | {
    type: "OVERRIDE_UPPER";
    with: "One";
    param: ParamCardinality;
} | {
    type: "MULTIPLY";
    params: ParamCardinality[];
} | {
    type: "IDENTITY";
    param: ParamCardinality;
};
export interface FuncopParamNamed extends $.introspect.FuncopParam {
    genTypeName: string;
}
export declare function getReturnCardinality(name: string, params: FuncopParamNamed[], returnTypemod: $.introspect.FuncopTypemod, preservesOptionality?: boolean): ReturnCardinality;
export declare function generateReturnCardinality(name: string, params: FuncopParamNamed[], returnTypemod: $.introspect.FuncopTypemod, preservesOptionality?: boolean): string;
export {};
