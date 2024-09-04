import { $, type Client } from "edgedb";
import { type CommandOptions } from "./commandutil";
import type { Target } from "./genutil";
export declare function generateQueryFiles(params: {
    root: string | null;
    options: CommandOptions;
    client: Client;
    schemaDir: string;
}): Promise<void>;
export declare function stringifyImports(imports: ImportMap): string;
type QueryType = Awaited<ReturnType<(typeof $)["analyzeQuery"]>>;
export declare function generateFiles(params: {
    target: Target;
    path: string;
    types: Omit<QueryType, "imports" | "importMap"> & Partial<Pick<QueryType, "imports" | "importMap">>;
}): {
    path: string;
    contents: string;
    imports: ImportMap;
    extension: string;
}[];
export declare const cardinalityToExecutorMethod: {
    One: "queryRequiredSingle";
    AtMostOne: "querySingle";
    Many: "query";
    AtLeastOne: "queryRequired";
    Empty: "query";
};
export declare class ImportMap extends Map<string, Set<string>> {
    add(module: string, specifier: string): this;
    merge(map: ImportMap): ImportMap;
}
export {};
