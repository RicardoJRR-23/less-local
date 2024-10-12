import fs from 'fs';
import path from 'path';

import add_to_package_json from '../add_to_package_json/index.js';
import convert_snake_to_camel_case from '../convert_snake_to_camel_case/index.js';

const config_code = `const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class LessSqliteDB {
  #db;
  constructor() {
    this.#db = new sqlite3.Database(
      '#slite-database-path#', 
      sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
          console.log('Connecting to sqlite error: ', err);
          throw err;
        }
      }
    );
  }

  close() {
    this.#db.close()
  }

  #execute_query = async (query) => {
    return (new Promise((resolve, reject) => this.#db.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    ))).then();
  }

  #map_value = (value) => {
    return typeof value === 'string'
    ? \`'\${value}'\`
    : value
  }

  async create(table, columns) {
    const columns_to_insert = Object.keys(columns);
    
    const values_to_insert = Object.values(columns).map(this.#map_value);

    const result = await this.#execute_query(
      \`INSERT INTO \${table} (\${columns_to_insert.join(', ')}) VALUES(\${values_to_insert.join(', ')});\`
    );

    return result;
  }

  async update(table, { columns, where }) {
    const set_query = Object.keys(columns).map(
      column => \`\${column} = \${this.#map_value(columns[column])}\`
    ).join(', ');

    const where_query = Object.keys(where).map(column => {
      if (typeof where[column] == 'object') {
        const operator = Object.keys(where[column])[0];
        return \`\${column} \${operator} \${
          Array.isArray(where[column][operator])
            ? \`(\${where[column][operator] 
              .map(this.#map_value)
              .join(', ')})\`
            : this.#map_value(where[column][operator])
        }\`
      } 
      return \`\${column} = \${this.#map_value(where[column])}\`})
    .join(' AND');

    const result = await this.#execute_query(
      \`UPDATE \${table} SET \${set_query}\${where_query ? \` WHERE \${where_query}\` : ''};\`
    );

    return result;
  }

  async getOne(table, where) {
    const option = Object
      .keys(where)
      .map(column => {
        if (typeof where[column] == 'object') {
          const operator = Object.keys(where[column])[0];
          return \`\${column} \${operator} \${
            Array.isArray(where[column][operator])
              ? \`(\${where[column][operator] 
                .map(this.#map_value)
                .join(', ')})\`
              : this.#map_value(where[column][operator])
          }\`
        } 
        return \`\${column} = \${this.#map_value(where[column])}\`})
      .join(' AND');
    
    const result = await this.#execute_query(
      \`SELECT * FROM \${table} WHERE \${option};\`
    );

    return result[0];
  }

  async getAll(table, where) {
    let query = \`SELECT * FROM \${table}\`;
    if (where) {
      query += \` WHERE \${Object.keys(where).map(column => {
        if (typeof where[column] == 'object') {
          const operator = Object.keys(where[column])[0];
          return \`\${column} \${operator} \${
            Array.isArray(where[column][operator])
              ? \`(\${where[column][operator] 
                .map(this.#map_value)
                .join(', ')})\`
              : this.#map_value(where[column][operator])
          }\`
        } 
        return \`\${column} = \${this.#map_value(where[column])}\`})
      .join(' AND')}\`;
    }
    query += ';';

    const result = await this.#execute_query(query);

    return result;
  }

  async delete(table, where) {
    const option = Object
      .keys(where)
      .map(column => {
        if (typeof where[column] == 'object') {
          const operator = Object.keys(where[column])[0];
          return \`\${column} \${operator} \${
            Array.isArray(where[column][operator])
              ? \`(\${where[column][operator] 
                .map(this.#map_value)
                .join(', ')})\`
              : this.#map_value(where[column][operator])
          }\`
        } 
        return \`\${column} = \${this.#map_value(where[column])}\`})
      .join(' AND');

    const result = await this.#execute_query(\`DELETE FROM \${table} WHERE \${option};\`);

    return result;
  }
};

module.exports = LessSqliteDB;
`;

const dependency_code = `const config = require('./#db-folder#');

class TableModule extends config {
  constructor(table_name) {
    super();
    this.table_name = table_name;
  }
  
  close() {
    return super.close();
  }
  
  async create(payload) {
    return super.create(this.table_name, payload);
  }
  
  async update({ columns, where }) {
    return super.update(this.table_name, { columns, where });
  }
  
  async getOne(where) {
    return super.getOne(this.table_name, where);
  }
  
  async getAll(where) {
    return super.getAll(this.table_name, where);
  }
  
  async delete(where) {
    return super.delete(this.table_name, where);
  }
};

#resources-db#

module.exports = {
  #resources-db-exports#
};
`;

const table_module_snipped_code = `class #table-module# extends TableModule {
  constructor() {
    super('#table#');
  }
};
`;

const build = (config) => {
  const less_sqlite = path.resolve(
    config.project_build_path,
    config.sqlite_database_dependency
  );
  const db_folder = 'config';

  const db_path = path.resolve(
    less_sqlite,
    db_folder
  );

  fs.mkdirSync(db_path, { recursive: true});
  fs.writeFileSync(
    db_path + '/index.js',
    config_code.replace(
      '#slite-database-path#',
      path.resolve(config.project_build_path, config.less_sqlite_db)
    )
  );

  const resources_db = Object.values(config.less_sqlite_tables).map(table => {
    const table_module = `${convert_snake_to_camel_case(table)}DB`;

    return {
      export: table_module,
      code: table_module_snipped_code
        .replaceAll('#table#', table)
        .replace('#table-module#', table_module)
    };
  });

  fs.writeFileSync(
    less_sqlite + '/index.js',
    dependency_code
      .replace('#db-folder#', db_folder)
      .replace('#resources-db#', resources_db.map(el => el.code).join('\n\n'))
      .replace('#resources-db-exports#', resources_db.map(el => el.export).join(',\n  '))
  );

  add_to_package_json(config, {
    dependencies: {
      sqlite3: "^5.1.7",
      cors: "^2.8.5"
    },
    devDependencies: {
      [config.sqlite_database_dependency]: `file:./${config.sqlite_database_dependency}`
    }
  });
};

export default build;