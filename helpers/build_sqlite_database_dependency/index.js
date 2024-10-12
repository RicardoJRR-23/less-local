import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

import build_javascript from './javascript.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const build_sqlite_database_dependency = async (config) => {
  if (!fs.existsSync(path.resolve(config.project_build_path, config.less_sqlite_db))) {
    await new Promise((resolve, reject) => exec(
      `cd ${config.project_build_path} && sqlite3 ${config.less_sqlite_db} < ${__dirname}/query.sql`,
      (error, stdout, stderr) => {
        if (error) {
          reject('Error: Failed to create sqlite database.', error);
          return;
        }
  
        resolve(stdout);
      }
    ));
  }

  build_javascript(config);
}

export default build_sqlite_database_dependency;