import os from 'os';
import fs from 'fs';
import path from 'path';

const less_local_file_path = path.join(
  os.homedir(),
  '/.less-local'
);

export const get = () => {
  if (!fs.existsSync(less_local_file_path)) {
    return null;
  }

  const less_local_file = fs.readFileSync(less_local_file_path, 'utf-8');

  return JSON.parse(less_local_file).BUILD_PATH;
};

export const set = (build_path) => {
  const builds_directory_name = 'less-local-builds';

  const less_local_build_path = path.resolve(
    build_path,
    builds_directory_name,
  );

  fs.writeFileSync(
    less_local_file_path,
    JSON.stringify({ BUILD_PATH: less_local_build_path })
  );

  fs.mkdirSync(less_local_build_path, { recursive: true });
};


