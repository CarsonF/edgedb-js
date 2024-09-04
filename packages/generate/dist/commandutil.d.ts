#!/usr/bin/env node
import { type Target } from "./genutil";
export interface CommandOptions {
    showHelp?: boolean;
    target?: Target;
    out?: string;
    file?: string;
    watch?: boolean;
    promptPassword?: boolean;
    passwordFromStdin?: boolean;
    forceOverwrite?: boolean;
    updateIgnoreFile?: boolean;
    useHttpClient?: boolean;
}
export declare function isTTY(): boolean;
export declare function promptBoolean(prompt: string, defaultVal?: boolean): Promise<boolean>;
export declare function promptForPassword(username: string): Promise<string>;
export declare function readPasswordFromStdin(): Promise<string>;
