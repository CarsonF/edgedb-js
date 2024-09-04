import { $, type Client } from "edgedb";
import { type CommandOptions } from "./commandutil";
import { DirBuilder } from "./builders";
export declare const configFileHeader = "// EdgeDB query builder";
export type GeneratorParams = {
    dir: DirBuilder;
    types: $.introspect.Types;
    typesByName: Record<string, $.introspect.Type>;
    casts: $.introspect.Casts;
    scalars: $.introspect.ScalarTypes;
    functions: $.introspect.FunctionTypes;
    globals: $.introspect.Globals;
    operators: $.introspect.OperatorTypes;
    edgedbVersion: Version;
};
export type Target = "ts" | "esm" | "cjs" | "mts" | "deno";
export type Version = {
    major: number;
    minor: number;
};
export declare function generateQueryBuilder(params: {
    root: string | null;
    options: CommandOptions;
    client: Client;
    schemaDir: string;
}): Promise<void>;
