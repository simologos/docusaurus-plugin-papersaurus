"use strict";
/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const import_fresh_1 = __importDefault(require("import-fresh"));
function loadConfig(configPath) {
    const pluginLogPrefix = '[papersaurus] ';
    if (!fs_extra_1.default.existsSync(configPath)) {
        throw new Error(`${pluginLogPrefix}Config file "${configPath}" not found`);
    }
    const loadedConfig = import_fresh_1.default(configPath);
    return loadedConfig;
}
exports.default = loadConfig;
