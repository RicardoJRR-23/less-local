import ora from 'ora';
import chalk from 'chalk';

import * as build_path_helper from '../../helpers/build_path/index.js';

const configure = async (arg) => {
  const spinner = ora('[less-local] Configuring the build path.').start();
  build_path_helper.set(arg);
  spinner.stop();
  console.log(chalk.yellowBright('[less-local]'), chalk.green('Build path configured.'), '✅');
};

export default configure;