import fs from 'fs';
import ora from 'ora';
import path from 'path';
import chalk from 'chalk';
import { exec } from 'child_process';
import { randomUUID } from 'crypto';

import { get as get_build_path } from '../../helpers/build_path/index.js';
import check_resources from '../../helpers/check_resources/index.js';
import build_shared_code from '../../helpers/build_shared_code/index.js';
import build_less_dependencies from '../../helpers/build_less_dependencies/index.js';
import build_sqlite_database_dependency from '../../helpers/build_sqlite_database_dependency/index.js';
import create_dotenv_based_on_less_config from '../../helpers/create_dotenv_based_on_less_config/index.js';
import build_topics from '../../helpers/build_topics/index.js';
import build_apis from '../../helpers/build_apis/index.js';
import build_sockets from '../../helpers/build_sockets/index.js';
import build_crons from '../../helpers/build_crons/index.js';
import add_to_package_json from '../../helpers/add_to_package_json/index.js';
import less_app_config_file from '../../helpers/less_app_config_file/index.js';
import run_app from '../../helpers/run_app/index.js';
import build_cloud_functions from '../../helpers/build_cloud_functions/index.js';

import { APP_CONFIG_FILE, LESS_LOCAL_FLAG, LESS_LOCAL_INFO_FLAG } from '../../constants/index.js'

const python_handler = `import sys
import json
import argparse
#python-import#

#python-snipped-code#

parser = argparse.ArgumentParser()
parser.add_argument('--data')
args = parser.parse_args()

def handler(data):
  #python-function-call#

response = handler(args.data)

sys.stdout.write(f'#LESS-EXPRESS::RETURNING-RESPONSE::<{{{json.dumps(response)}}}>::RETURNING-RESPONSE::LESS-EXPRESS#')
`;

const build = async (build_name) => {
  try {
    const project_location = process.cwd();
    const less_local_flag = chalk.yellowBright(LESS_LOCAL_FLAG);
    const spinner = ora();

    const project_build_path = path.join(
      get_build_path(),
      build_name
    );

    const less_sqlite_db = 'less-sqlite-db.db';
    const project_build_exists = fs.existsSync(project_build_path);

    if (project_build_exists) {
      const build_files_and_folders = fs.readdirSync(project_build_path);
      build_files_and_folders.map(item => {
        const items_to_spare = [less_sqlite_db, 'node_modules', 'yarn.lock'];
        if (items_to_spare.includes(item)) {
          return;
        }

        const item_path = path.resolve(project_build_path, item);
        if (fs.statSync(item_path).isDirectory()) {
          fs.rmSync(item_path, { recursive: true });
        } else {
          fs.unlinkSync(item_path);
        }
      });
    }

    const project_less_resources_location = path.resolve(
      project_location,
      'less'
    );

    if (!fs.existsSync(project_less_resources_location)) {
      console.log(
        less_local_flag,
        chalk.redBright('Error: Your project does not contain a "less" folder.')
      );
      process.exitCode = 1;
      return;
    }
    
    const less_resources = {
      apis: 'apis',
      shared: 'shared',
      topics: 'topics',
      sockets: 'sockets',
      crons: 'crons',
      functions: 'functions'
    };

    const less_resources_copied = { ...less_resources };
    delete less_resources_copied.shared;
    if (!check_resources(project_less_resources_location, less_resources_copied)) {
      console.log(
        less_local_flag,
        chalk.redBright('Error: On the "less" folder, project should have at least one of the follow resources:')
      );
      console.log(
        chalk.yellowBright(
          Object
            .values(less_resources_copied)
            .map(resource => `  - ${resource}`)
            .join('\n')
        )
      );
      throw Error('less resources not found');
    }
    
    const chuva_dependency = '@chuva.io/less';
    const less_sqlite_tables = {
      topics: 'topics_processors_queues',
      kvs: 'key_value_storage'
    };
    const config = {
      apis: {},
      shared: [],
      build_name,
      sockets: {},
      less_resources,
      python_handler,
      less_sqlite_db,
      app_imports: '',
      app_callers: '',
      chuva_dependency,
      project_location,
      socket_port: 8000,
      project_build_path,
      less_sqlite_tables,
      rest_api_port: 3333,
      api_routes: 'routes',
      content_paths_to_delete: [],
      project_less_resources_location,
      sqlite_database_dependency: 'lessSqliteDB',
      less_local_info_flag: LESS_LOCAL_INFO_FLAG,
      less_websocket_clients: 'lessWebsocketClients',
      javascript_dependencies_file_name: 'package.json',
      python_handler_dependency: '@chuva.io/execute_python_handler',
      app_running_flag: `<app-is-running>${randomUUID()}}<app-is-running>`,
      chuva_dependency_path: path.resolve(project_build_path, chuva_dependency)
    };

    await create_dotenv_based_on_less_config(config);
    build_less_dependencies(config);
    await build_sqlite_database_dependency(config);
    build_shared_code(config);

    spinner.text = `${chalk.gray(`${LESS_LOCAL_FLAG} Building...`)}🚀`;
    spinner.start();
    build_topics(config);
    build_apis(config);
    build_sockets(config);
    build_crons(config);
    build_cloud_functions(config);
    add_to_package_json(config, {
      dependencies: {
        "cron": "^3.1.7"
      }
    });
    spinner.stop();
    console.log(
      less_local_flag,
      chalk.greenBright('Resources built with success ✅')
    );
    
    fs.writeFileSync(
      path.resolve(config.project_build_path, 'app.js'),
      `${config.app_imports}
    
${config.app_callers}
console.log(require('./${APP_CONFIG_FILE}').app_running_flag);
`
    );

    spinner.text = `${chalk.gray(`${LESS_LOCAL_FLAG} Installing packages...`)}📦`;
    spinner.start();
    await new Promise((resolve, reject) => exec(
      `cd ${config.project_build_path}
yarn
yarn upgrade ${config.shared.join(' ')}`,
      (error, stdout, stderr) => {
        if (error) {
          reject(error.toString('utf-8'));
          return;
        }

        resolve();
      }
    ));
    spinner.stop();
    console.log(
      less_local_flag,
      chalk.greenBright('Packages installed with success ✅')
    );

    less_app_config_file.set(config.project_build_path, {
      apis: config.apis,
      sockets: config.sockets,
      app_running_flag: config.app_running_flag
    });

    await run_app(config);
  } catch(error) {
    console.log('Build ~ error:', error);
    process.exitCode = 1;
  }
};

export default build;