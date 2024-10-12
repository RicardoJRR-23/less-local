#!/usr/bin/env node
import { Command } from 'commander';
import configure from '../commands/configure/index.js';
import check_build_path from '../helpers/check_build_path/index.js';
import build from '../commands/build/index.js';
import run_app from '../commands/run_app/index.js';
import delete_app from '../commands/delete/index.js';
import list_apps from '../commands/list_apps/index.js';

const program = new Command();

program
  .name('less-local')
  .description('cli to build a less project locally')
  .usage('[COMMAND]')
  .hook('postAction', () => {
    if (process.exitCode && process.exitCode !== 0) {
      process.exit(process.exitCode);
    }
    process.exit(0);
  });

program
  .command('configure <build-path>')
  .description('The path where the project builds should be located.')
  .action(configure);

program
  .command('build <project-name>')
  .description('Building a less project locally')
  .action(build)
  .hook('preAction', check_build_path);

program
  .command('run <project-name>')
  .description('Start a built project')
  .action(run_app)
  .hook('preAction', check_build_path);

program
  .command('delete <project-name>')
  .description('Delete a built project')
  .action(delete_app)
  .hook('preAction', check_build_path);

program
  .command('list')
  .description('List all built projects')
  .action(list_apps);

program.parse();
