"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configFileHeader = void 0;
exports.generateQueryBuilder = generateQueryBuilder;
const edgedb_1 = require("edgedb");
const commandutil_1 = require("./commandutil");
const genutil_1 = require("./genutil");
const builders_1 = require("./builders");
const FILES_1 = require("./FILES");
const generateCastMaps_1 = require("./edgeql-js/generateCastMaps");
const generateFunctionTypes_1 = require("./edgeql-js/generateFunctionTypes");
const generateGlobals_1 = require("./edgeql-js/generateGlobals");
const generateIndex_1 = require("./edgeql-js/generateIndex");
const generateObjectTypes_1 = require("./edgeql-js/generateObjectTypes");
const generateOperatorTypes_1 = require("./edgeql-js/generateOperatorTypes");
const generateRuntimeSpec_1 = require("./edgeql-js/generateRuntimeSpec");
const generateScalars_1 = require("./edgeql-js/generateScalars");
const generateSetImpl_1 = require("./edgeql-js/generateSetImpl");
const { path, fs, readFileUtf8, exists, walk } = edgedb_1.adapter;
exports.configFileHeader = `// EdgeDB query builder`;
async function generateQueryBuilder(params) {
    const { root, options, client: cxn, schemaDir } = params;
    let outputDir;
    if (options.out) {
        outputDir = path.isAbsolute(options.out)
            ? options.out
            : path.join(edgedb_1.adapter.process.cwd(), options.out);
    }
    else if (root) {
        outputDir = path.join(root, schemaDir, "edgeql-js");
    }
    else {
        throw new Error(`No edgedb.toml found. Initialize an EdgeDB project with\n\`edgedb project init\` or specify an output directory with \`--output-dir\``);
    }
    let outputDirIsInProject = false;
    let prettyOutputDir;
    if (root) {
        const relativeOutputDir = path.posix.relative(root, outputDir);
        outputDirIsInProject =
            !relativeOutputDir.startsWith("..");
        prettyOutputDir = outputDirIsInProject
            ? `./${relativeOutputDir}`
            : outputDir;
    }
    else {
        prettyOutputDir = outputDir;
    }
    if (await exists(outputDir)) {
        if (await canOverwrite(outputDir, options)) {
        }
    }
    else {
        options.updateIgnoreFile ??= true;
    }
    const target = options.target;
    const dir = new builders_1.DirBuilder();
    console.log(`Introspecting database schema...`);
    const [types, scalars, casts, functions, operators, globals, version] = await Promise.all([
        edgedb_1.$.introspect.types(cxn),
        edgedb_1.$.introspect.scalars(cxn),
        edgedb_1.$.introspect.casts(cxn),
        edgedb_1.$.introspect.functions(cxn),
        edgedb_1.$.introspect.operators(cxn),
        edgedb_1.$.introspect.globals(cxn),
        cxn.queryRequiredSingle(`select sys::get_version()`),
    ]);
    const typesByName = {};
    for (const type of types.values()) {
        typesByName[type.name] = type;
        if (!type.name.includes("::"))
            continue;
    }
    const generatorParams = {
        dir,
        types,
        typesByName,
        casts,
        scalars,
        functions,
        globals,
        operators,
        edgedbVersion: version,
    };
    console.log("Generating runtime spec...");
    (0, generateRuntimeSpec_1.generateRuntimeSpec)(generatorParams);
    console.log("Generating cast maps...");
    (0, generateCastMaps_1.generateCastMaps)(generatorParams);
    console.log("Generating scalars...");
    (0, generateScalars_1.generateScalars)(generatorParams);
    console.log("Generating object types...");
    (0, generateObjectTypes_1.generateObjectTypes)(generatorParams);
    console.log("Generating function types...");
    (0, generateFunctionTypes_1.generateFunctionTypes)(generatorParams);
    console.log("Generating operators...");
    (0, generateOperatorTypes_1.generateOperators)(generatorParams);
    console.log("Generating set impl...");
    (0, generateSetImpl_1.generateSetImpl)(generatorParams);
    console.log("Generating globals...");
    (0, generateGlobals_1.generateGlobals)(generatorParams);
    if (version.major < 4) {
        dir._modules.delete("fts");
        dir._map.delete("modules/fts");
    }
    console.log("Generating index...");
    (0, generateIndex_1.generateIndex)(generatorParams);
    const importsFile = dir.getPath("imports");
    importsFile.addExportStar("edgedb", { as: "edgedb" });
    importsFile.addExportFrom({ spec: true }, "./__spec__", {
        allowFileExt: true,
    });
    importsFile.addExportStar("./syntax", {
        allowFileExt: true,
        as: "syntax",
    });
    importsFile.addExportStar("./castMaps", {
        allowFileExt: true,
        as: "castMaps",
    });
    const initialFiles = new Set(await walk(outputDir));
    const written = new Set();
    const syntaxOutDir = path.join(outputDir);
    if (!(await exists(syntaxOutDir))) {
        await fs.mkdir(syntaxOutDir);
    }
    const syntaxFiles = FILES_1.syntax[target];
    if (!syntaxFiles) {
        throw new Error(`Error: no syntax files found for target "${target}"`);
    }
    for (const f of syntaxFiles) {
        const outputPath = path.join(syntaxOutDir, f.path);
        written.add(outputPath);
        const oldContents = await readFileUtf8(outputPath)
            .then((content) => content)
            .catch(() => "");
        const newContents = genutil_1.headerComment + f.content;
        if (oldContents !== newContents) {
            await fs.writeFile(outputPath, newContents);
        }
    }
    if (target === "ts") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".ts",
            moduleExtension: "",
            written,
        }, genutil_1.headerComment);
    }
    else if (target === "mts") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".mts",
            moduleExtension: ".mjs",
            written,
        }, genutil_1.headerComment);
    }
    else if (target === "cjs") {
        await dir.write(outputDir, {
            mode: "js",
            moduleKind: "cjs",
            fileExtension: ".js",
            moduleExtension: "",
            written,
        }, genutil_1.headerComment);
        await dir.write(outputDir, {
            mode: "dts",
            moduleKind: "esm",
            fileExtension: ".d.ts",
            moduleExtension: "",
            written,
        }, genutil_1.headerComment);
    }
    else if (target === "esm") {
        await dir.write(outputDir, {
            mode: "js",
            moduleKind: "esm",
            fileExtension: ".mjs",
            moduleExtension: ".mjs",
            written,
        }, genutil_1.headerComment);
        await dir.write(outputDir, {
            mode: "dts",
            moduleKind: "esm",
            fileExtension: ".d.ts",
            moduleExtension: "",
            written,
        }, genutil_1.headerComment);
    }
    else if (target === "deno") {
        await dir.write(outputDir, {
            mode: "ts",
            moduleKind: "esm",
            fileExtension: ".ts",
            moduleExtension: ".ts",
            written,
        }, genutil_1.headerComment);
    }
    const configPath = path.join(outputDir, "config.json");
    await fs.writeFile(configPath, `${exports.configFileHeader}\n${JSON.stringify({ target })}\n`);
    written.add(configPath);
    for (const file of initialFiles) {
        if (written.has(file)) {
            continue;
        }
        await fs.rm(file);
    }
    console.log(`Writing files to ${prettyOutputDir}`);
    console.log(`Generation complete! 🤘`);
    if (!outputDirIsInProject || !root) {
        console.log(`\nChecking the generated files into version control is
not recommended. Consider updating the .gitignore of your
project to exclude these files.`);
    }
    else if (options.updateIgnoreFile) {
        const gitIgnorePath = path.join(root, ".gitignore");
        const gitIgnoreFile = await readFileUtf8(gitIgnorePath)
            .then((content) => content)
            .catch(() => null);
        const vcsLine = path.posix.relative(root, outputDir);
        if (gitIgnoreFile === null ||
            !RegExp(`^${vcsLine}$`, "m").test(gitIgnoreFile)) {
            if ((0, commandutil_1.isTTY)() &&
                (await (0, commandutil_1.promptBoolean)(gitIgnoreFile === null
                    ? `Checking the generated query builder into version control
is not recommended. Would you like to create a .gitignore file to ignore
the query builder directory? `
                    : `Checking the generated query builder into version control
is not recommended. Would you like to update .gitignore to ignore
the query builder directory? The following line will be added:

   ${vcsLine}\n\n`, true))) {
                await fs.appendFile(gitIgnorePath, `${gitIgnoreFile === null ? "" : "\n"}${vcsLine}\n`);
            }
        }
    }
}
async function canOverwrite(outputDir, options) {
    if (options.forceOverwrite) {
        return true;
    }
    let config = null;
    try {
        const configFile = await readFileUtf8(path.join(outputDir, "config.json"));
        if (configFile.startsWith(exports.configFileHeader)) {
            config = JSON.parse(configFile.slice(exports.configFileHeader.length));
            if (config.target === options.target) {
                return true;
            }
        }
    }
    catch { }
    const error = config
        ? `Error: A query builder with a different config already exists in that location.`
        : `Error: Output directory '${outputDir}' already exists.`;
    if ((0, commandutil_1.isTTY)() &&
        (await (0, commandutil_1.promptBoolean)(`${error}\nDo you want to overwrite? `, true))) {
        return true;
    }
    throw new Error(error);
}
