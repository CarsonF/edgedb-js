#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const edgedb_1 = require("edgedb");
const TOML = __importStar(require("@iarna/toml"));
const conUtils_1 = require("edgedb/dist/conUtils");
const conUtils_server_1 = require("edgedb/dist/conUtils.server");
const commandutil_1 = require("./commandutil");
const edgeql_js_1 = require("./edgeql-js");
const interfaces_1 = require("./interfaces");
const genutil_1 = require("./genutil");
const queries_1 = require("./queries");
const { path, readFileUtf8, exists } = edgedb_1.adapter;
var Generator;
(function (Generator) {
    Generator["QueryBuilder"] = "edgeql-js";
    Generator["Queries"] = "queries";
    Generator["Interfaces"] = "interfaces";
})(Generator || (Generator = {}));
const availableGeneratorsHelp = `
Available generators:
 - edgeql-js (query builder)
 - queries (query files)
 - interfaces`;
const run = async () => {
    const args = edgedb_1.adapter.process.argv.slice(2);
    const generator = args.shift();
    const connectionConfig = {};
    const options = {};
    if (generator === "-h" || generator === "--help") {
        printHelp();
        edgedb_1.adapter.process.exit();
    }
    if (!generator || generator[0] === "-") {
        console.error(`Error: No generator specified.\n  \`npx @edgedb/generate <generator>\`${availableGeneratorsHelp}`);
        edgedb_1.adapter.exit();
    }
    if (!Object.values(Generator).includes(generator)) {
        console.error(`Error: Invalid generator "${generator}".${availableGeneratorsHelp}`);
        edgedb_1.adapter.exit();
    }
    switch (generator) {
        case Generator.QueryBuilder:
            break;
        case Generator.Queries:
            break;
        case Generator.Interfaces:
            options.target = "ts";
            break;
    }
    let projectRoot = null;
    let currentDir = edgedb_1.adapter.process.cwd();
    let schemaDir = "dbschema";
    const systemRoot = path.parse(currentDir).root;
    while (currentDir !== systemRoot) {
        if (await exists(path.join(currentDir, "edgedb.toml"))) {
            projectRoot = currentDir;
            const config = TOML.parse(await readFileUtf8(currentDir, "edgedb.toml"));
            const maybeProjectTable = config.project;
            const maybeSchemaDir = maybeProjectTable && maybeProjectTable["schema-dir"];
            if (typeof maybeSchemaDir === "string") {
                schemaDir = maybeSchemaDir;
            }
            break;
        }
        currentDir = path.join(currentDir, "..");
    }
    while (args.length) {
        let flag = args.shift();
        let val = null;
        if (flag.startsWith("--")) {
            if (flag.includes("=")) {
                const [f, ...v] = flag.split("=");
                flag = f;
                val = v.join("=");
            }
        }
        else if (flag.startsWith("-")) {
            val = flag.slice(2) || null;
            flag = flag.slice(0, 2);
        }
        const getVal = () => {
            if (val !== null) {
                const v = val;
                val = null;
                return v;
            }
            if (args.length === 0) {
                console.error(`Error: No value provided for ${flag} option`);
                edgedb_1.adapter.exit();
            }
            return args.shift();
        };
        switch (flag) {
            case "-h":
            case "--help":
                options.showHelp = true;
                break;
            case "-I":
            case "--instance":
            case "--dsn":
                connectionConfig.dsn = getVal();
                break;
            case "--credentials-file":
                connectionConfig.credentialsFile = getVal();
                break;
            case "-H":
            case "--host":
                connectionConfig.host = getVal();
                break;
            case "-P":
            case "--port":
                connectionConfig.port = Number(getVal());
                break;
            case "-d":
            case "--database":
                connectionConfig.database = getVal();
                break;
            case "-u":
            case "--user":
                connectionConfig.user = getVal();
                break;
            case "--password":
                if (options.passwordFromStdin === true) {
                    (0, genutil_1.exitWithError)(`Cannot use both --password and --password-from-stdin options`);
                }
                options.promptPassword = true;
                break;
            case "--password-from-stdin":
                if (options.promptPassword === true) {
                    (0, genutil_1.exitWithError)(`Cannot use both --password and --password-from-stdin options`);
                }
                options.passwordFromStdin = true;
                break;
            case "--tls-ca-file":
                connectionConfig.tlsCAFile = getVal();
                break;
            case "--tls-security": {
                const tlsSec = getVal();
                if (!(0, conUtils_1.isValidTlsSecurityValue)(tlsSec)) {
                    (0, genutil_1.exitWithError)(`Invalid value for --tls-security. Must be one of: ${conUtils_1.validTlsSecurityValues
                        .map((x) => `"${x}"`)
                        .join(" | ")}`);
                }
                connectionConfig.tlsSecurity = tlsSec;
                break;
            }
            case "--use-http-client":
                options.useHttpClient = true;
                break;
            case "--target": {
                if (generator === Generator.Interfaces) {
                    (0, genutil_1.exitWithError)(`--target is not supported for generator "${generator}"`);
                }
                const target = getVal();
                if (!target || !["ts", "esm", "cjs", "mts", "deno"].includes(target)) {
                    (0, genutil_1.exitWithError)(`Invalid target "${target ?? ""}", expected "deno", "mts", "ts", "esm" or "cjs"`);
                }
                options.target = target;
                break;
            }
            case "--out":
            case "--output-dir":
                if (generator === Generator.Interfaces ||
                    generator === Generator.Queries) {
                    (0, genutil_1.exitWithError)(`--output-dir is not supported for generator "${generator}"` +
                        `, consider using the --file option instead`);
                }
                options.out = getVal();
                break;
            case "--file":
                if (generator === Generator.Interfaces) {
                    options.file = getVal();
                }
                else if (generator === Generator.Queries) {
                    if (args.length > 0 && args[0][0] !== "-") {
                        options.file = getVal();
                    }
                    else {
                        options.file = edgedb_1.adapter.path.join(schemaDir, "queries");
                    }
                }
                else {
                    (0, genutil_1.exitWithError)(`Flag --file not supported for generator "${generator}"` +
                        `, consider using the --output-dir option instead`);
                }
                break;
            case "--watch":
                options.watch = true;
                (0, genutil_1.exitWithError)(`Watch mode is not supported for generator "${generator}"`);
                break;
            case "--force-overwrite":
                options.forceOverwrite = true;
                break;
            case "--no-update-ignore-file":
                options.updateIgnoreFile = false;
                break;
            default:
                (0, genutil_1.exitWithError)(`Unknown option: ${flag}`);
        }
        if (val !== null) {
            (0, genutil_1.exitWithError)(`Option ${flag} does not take a value`);
        }
    }
    if (options.showHelp) {
        printHelp();
        edgedb_1.adapter.process.exit();
    }
    switch (generator) {
        case Generator.QueryBuilder:
            console.log(`Generating query builder...`);
            break;
        case Generator.Queries:
            console.log(`Generating functions from .edgeql files...`);
            break;
        case Generator.Interfaces:
            console.log(`Generating TS interfaces from schema...`);
            break;
    }
    if (!options.target) {
        if (!projectRoot) {
            throw new Error(`Failed to detect project root.
Run this command inside an EdgeDB project directory or specify the desired target language with \`--target\``);
        }
        const tsConfigPath = path.join(projectRoot, "tsconfig.json");
        const tsConfigExists = await exists(tsConfigPath);
        const denoConfigPath = path.join(projectRoot, "deno.json");
        const denoJsonExists = await exists(denoConfigPath);
        let packageJson = null;
        const pkgJsonPath = path.join(projectRoot, "package.json");
        if (await exists(pkgJsonPath)) {
            packageJson = JSON.parse(await readFileUtf8(pkgJsonPath));
        }
        const isDenoRuntime = typeof Deno !== "undefined";
        if (isDenoRuntime || denoJsonExists) {
            options.target = "deno";
            console.log(`Detected ${isDenoRuntime ? "Deno runtime" : "deno.json"}, generating TypeScript files with Deno-style imports.`);
        }
        else if (tsConfigExists) {
            const tsConfig = tsConfigExists
                ? (await readFileUtf8(tsConfigPath)).toLowerCase()
                : "{}";
            const supportsESM = tsConfig.includes(`"module": "nodenext"`) ||
                tsConfig.includes(`"module": "node12"`);
            if (supportsESM && packageJson?.type === "module") {
                options.target = "mts";
                console.log(`Detected tsconfig.json with ES module support, generating .mts files with ESM imports.`);
            }
            else {
                options.target = "ts";
                console.log(`Detected tsconfig.json, generating TypeScript files.`);
            }
        }
        else {
            if (packageJson?.type === "module") {
                options.target = "esm";
                console.log(`Detected "type": "module" in package.json, generating .js files with ES module syntax.`);
            }
            else {
                console.log(`Detected package.json. Generating .js files with CommonJS module syntax.`);
                options.target = "cjs";
            }
        }
        const overrideTargetMessage = `   To override this, use the --target flag.
   Run \`npx @edgedb/generate --help\` for full options.`;
        console.log(overrideTargetMessage);
    }
    if (options.promptPassword) {
        const username = (await (0, conUtils_server_1.parseConnectArguments)({
            ...connectionConfig,
            password: "",
        })).connectionParams.user;
        connectionConfig.password = await (0, commandutil_1.promptForPassword)(username);
    }
    if (options.passwordFromStdin) {
        connectionConfig.password = await (0, commandutil_1.readPasswordFromStdin)();
    }
    let client;
    try {
        const cxnCreatorFn = options.useHttpClient
            ? edgedb_1.createHttpClient
            : edgedb_1.createClient;
        client = cxnCreatorFn({
            ...connectionConfig,
            concurrency: 5,
        });
    }
    catch (e) {
        (0, genutil_1.exitWithError)(`Failed to connect: ${e.message}`);
    }
    try {
        switch (generator) {
            case Generator.QueryBuilder:
                await (0, edgeql_js_1.generateQueryBuilder)({
                    options,
                    client,
                    root: projectRoot,
                    schemaDir,
                });
                break;
            case Generator.Queries:
                await (0, queries_1.generateQueryFiles)({
                    options,
                    client,
                    root: projectRoot,
                    schemaDir,
                });
                break;
            case Generator.Interfaces:
                await (0, interfaces_1.runInterfacesGenerator)({
                    options,
                    client,
                    root: projectRoot,
                    schemaDir,
                });
                break;
        }
    }
    catch (e) {
        (0, genutil_1.exitWithError)(e.message);
    }
    finally {
        await client.close();
    }
    edgedb_1.adapter.process.exit();
};
function printHelp() {
    console.log(`@edgedb/generate

Official EdgeDB code generators for TypeScript/JavaScript

USAGE
    npx @edgedb/generate [COMMAND] [OPTIONS]

COMMANDS:
    queries         Generate typed functions from .edgeql files
    edgeql-js       Generate query builder
    interfaces      Generate TS interfaces for schema types


CONNECTION OPTIONS:
    -I, --instance <instance>
    --dsn <dsn>
    --credentials-file <path/to/credentials.json>
    -H, --host <host>
    -P, --port <port>
    -d, --database <database>
    -u, --user <user>
    --password
    --password-from-stdin
    --tls-ca-file <path/to/certificate>
    --tls-security <insecure | no_host_verification | strict | default>

OPTIONS:
    --target [ts,mts,esm,cjs,deno]

        ts     Generate TypeScript files (.ts)
        mts    Generate TypeScript files (.mts) with ESM imports
        esm    Generate JavaScript with ESM syntax
        cjs    Generate JavaScript with CommonJS syntax
        deno   Generate TypeScript files (.ts) with Deno-style (*.ts) imports

    --out, --output-dir <path>
        Change the output directory the querybuilder files are generated into
        (Only valid for 'edgeql-js' generator)
    --file <path>
        Change the output filepath of the 'queries' and 'interfaces' generators
        When used with the 'queries' generator, also changes output to single-file mode
    --force-overwrite
        Overwrite <path> contents without confirmation
    --no-update-ignore-file
        Do not prompt to update gitignore with generated code
`);
}
run();
