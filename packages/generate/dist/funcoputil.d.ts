import { $ } from "edgedb";
import type { CodeFragment } from "./builders";
import type { FuncopDef } from "./edgeql-js/generateFunctionTypes";
export type AnytypeDef = {
    kind: "castable";
    type: CodeFragment[];
    returnAnytypeWrapper: string;
} | {
    kind: "noncastable";
    type: CodeFragment[];
    typeObj: $.introspect.Type;
    refName: string;
    refPath: string;
};
export type FuncopDefOverload<F extends FuncopDef> = F & {
    overloadIndex: number;
    params: GroupedParams;
    anytypes: AnytypeDef | null;
};
export declare function expandFuncopAnytypeOverloads<F extends FuncopDef>(overloads: F[], types: $.introspect.Types, casts: $.introspect.Casts, implicitCastableRootTypes: string[]): FuncopDefOverload<F>[];
declare function groupParams(params: $.introspect.FuncopParam[], types: $.introspect.Types): {
    positional: {
        type: $.introspect.Type;
        internalName: string;
        typeName: string;
        name: string;
        kind: $.introspect.FunctionParamKind;
        typemod: $.introspect.FuncopTypemod;
        hasDefault?: boolean;
    }[];
    named: {
        type: $.introspect.Type;
        typeName: string;
        name: string;
        kind: $.introspect.FunctionParamKind;
        typemod: $.introspect.FuncopTypemod;
        hasDefault?: boolean;
    }[];
};
export type GroupedParams = ReturnType<typeof groupParams>;
export declare function findPathOfAnytype(typeId: string, types: $.introspect.Types): string;
export declare function sortFuncopOverloads<F extends FuncopDef>(overloads: F[], typeSpecificities: TypeSpecificities): F[];
type TypeSpecificities = $.StrictMap<string, number>;
export declare function getTypesSpecificity(types: $.introspect.Types, casts: $.introspect.Casts): $.StrictMap<string, number>;
export declare function getImplicitCastableRootTypes(casts: $.introspect.Casts): string[];
export {};
