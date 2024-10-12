import fs from 'fs';
import ora from 'ora';
import chalk from 'chalk';
import { get as get_build_path } from '../../helpers/build_path/index.js';

import { LESS_LOCAL_FLAG } from '../../constants/index.js';

const list_apps = () => {
  const builts_path = get_build_path();

  const spinner = ora(chalk.gray(`${LESS_LOCAL_FLAG} Listing built apps...`));
  spinner.start();

  const less_local_flag = chalk.yellowBright(LESS_LOCAL_FLAG);

  let apps = fs.readdirSync(builts_path);
  apps = apps.filter(app => fs.statSync(builts_path + `/${app}`).isDirectory());

  if (apps.length === 0) {
    console.log(
      less_local_flag,
      chalk.greenBright('There are no built apps.')
    );

    return;
  }
  spinner.stop();

  console.log(
    less_local_flag,
    chalk.greenBright('Built apps:')
  );
  apps.forEach(app => {
    console.log(
      less_local_flag,
      chalk.greenBright(`\t- ${app}`)
    );
  });
  console.log(less_local_flag);
};

export default list_apps;