import type { CommandOptions } from "./commandutil";
import { type Client } from "edgedb";
export declare function runInterfacesGenerator(params: {
    root: string | null;
    options: CommandOptions;
    client: Client;
    schemaDir: string;
}): Promise<void>;
