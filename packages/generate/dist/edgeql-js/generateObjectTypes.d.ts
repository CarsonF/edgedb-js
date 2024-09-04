import { type CodeFragment } from "../builders";
import type { GeneratorParams } from "../genutil";
import type { $ } from "../genutil";
export declare const getStringRepresentation: (type: $.introspect.Type, params: {
    types: $.introspect.Types;
    anytype?: string | CodeFragment[];
    casts?: {
        [key: string]: string[];
    };
    castSuffix?: string;
}) => {
    staticType: CodeFragment[];
    runtimeType: CodeFragment[];
};
export declare const generateObjectTypes: (params: GeneratorParams) => void;
