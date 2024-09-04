#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTTY = isTTY;
exports.promptBoolean = promptBoolean;
exports.promptForPassword = promptForPassword;
exports.readPasswordFromStdin = readPasswordFromStdin;
const edgedb_1 = require("edgedb");
const genutil_1 = require("./genutil");
const { input } = edgedb_1.adapter;
function isTTY() {
    return edgedb_1.adapter.process.stdin.isTTY && edgedb_1.adapter.process.stdout.isTTY;
}
async function promptBoolean(prompt, defaultVal) {
    const response = await promptEnum(prompt, ["y", "n"], defaultVal !== undefined ? (defaultVal ? "y" : "n") : undefined);
    return response === "y";
}
async function promptEnum(question, vals, defaultVal) {
    let response = await input(`${question}[${vals.join("/")}]${defaultVal !== undefined ? ` (leave blank for "${defaultVal}")` : ""}\n> `);
    response = response.trim().toLowerCase();
    if (vals.includes(response)) {
        return response;
    }
    else if (!response && defaultVal !== undefined) {
        return defaultVal;
    }
    else {
        (0, genutil_1.exitWithError)(`Unknown value: '${response}'`);
    }
}
async function promptForPassword(username) {
    if (!isTTY()) {
        (0, genutil_1.exitWithError)(`Cannot use --password option in non-interactive mode. ` +
            `To read password from stdin use the --password-from-stdin option.`);
    }
    return await input(`Password for '${username}': `, { silent: true });
}
function readPasswordFromStdin() {
    if (edgedb_1.adapter.process.stdin.isTTY) {
        (0, genutil_1.exitWithError)(`Cannot read password from stdin: stdin is a TTY.`);
    }
    return new Promise((resolve) => {
        let data = "";
        edgedb_1.adapter.process.stdin.on("data", (chunk) => (data += chunk));
        edgedb_1.adapter.process.stdin.on("end", () => resolve(data.trimEnd()));
    });
}
