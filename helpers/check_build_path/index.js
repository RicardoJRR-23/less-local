import chalk from 'chalk';
import { get as get_build_path } from '../build_path/index.js';

const check_build_path = () => {
  const build_path = get_build_path();
  
  if (!build_path) {
    console.log(chalk.yellowBright('[less-local]'), chalk.red('Error: Build path not found.'));
    console.log(chalk.yellowBright('[less-local]'), chalk.greenBright('You must configured the build path using the command:'));
    console.log('  -', chalk.yellowBright('less-local configure <build-path>'));
    process.exit(1);
  }
};

export default check_build_path;