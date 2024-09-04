import type { GeneratorParams } from "../genutil";
export type GenerateInterfacesParams = Pick<GeneratorParams, "dir" | "types">;
export declare const generateInterfaces: (params: GenerateInterfacesParams) => void;
