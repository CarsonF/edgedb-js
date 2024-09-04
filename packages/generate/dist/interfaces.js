"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInterfacesGenerator = runInterfacesGenerator;
const genutil_1 = require("./genutil");
const edgedb_1 = require("edgedb");
const builders_1 = require("./builders");
const generateInterfaces_1 = require("./edgeql-js/generateInterfaces");
const { path } = edgedb_1.adapter;
async function runInterfacesGenerator(params) {
    const { root, options, client, schemaDir } = params;
    let outFile;
    if (options.file) {
        outFile = path.isAbsolute(options.file)
            ? options.file
            : path.join(edgedb_1.adapter.process.cwd(), options.file);
    }
    else if (root) {
        outFile = path.join(root, schemaDir, "interfaces.ts");
    }
    else {
        throw new Error(`No edgedb.toml found. Initialize an EdgeDB project with\n\`edgedb project init\` or specify an output file with \`--file\``);
    }
    let outputDirIsInProject = false;
    let prettyOutputDir;
    if (root) {
        const relativeOutputDir = path.posix.relative(root, outFile);
        outputDirIsInProject = !relativeOutputDir.startsWith("..");
        prettyOutputDir = outputDirIsInProject ? `./${relativeOutputDir}` : outFile;
    }
    else {
        prettyOutputDir = outFile;
    }
    const dir = new builders_1.DirBuilder();
    console.log(`Introspecting database schema...`);
    const types = await edgedb_1.$.introspect.types(client);
    const generatorParams = {
        dir,
        types,
    };
    console.log(`Generating interfaces...`);
    (0, generateInterfaces_1.generateInterfaces)(generatorParams);
    const file = dir.getPath("interfaces");
    const rendered = genutil_1.headerComment +
        file.render({
            mode: "ts",
            moduleKind: "esm",
            moduleExtension: "",
        });
    console.log(`Writing interfaces file...`);
    console.log("   " + prettyOutputDir);
    await edgedb_1.adapter.fs.writeFile(outFile, rendered);
    console.log(`Generation complete! 🤘`);
}
