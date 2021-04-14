/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs-extra';
import importFresh from 'import-fresh';
import {DocusaurusConfig} from '@docusaurus/types';

export default function loadConfig(configPath: string): DocusaurusConfig {

  const pluginLogPrefix = '[papersaurus] ';

  if (!fs.existsSync(configPath)) {
    throw new Error(`${pluginLogPrefix}Config file "${configPath}" not found`);
  }

  const loadedConfig = importFresh(configPath) as DocusaurusConfig;
  return loadedConfig
}
