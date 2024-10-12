import fs from 'fs';
import path from 'path';

import map_dirs_recursive from '../map_dirs_recursive/index.js';
import convert_snake_to_camel_case from '../convert_snake_to_camel_case/index.js';

const publishers_code = `const fs = require('fs');
const path = require('path');
const { #topics-table-module# } = require('#database-dependency#');
const { randomUUID } = require('crypto');
  
const topic_handler = async (topic_name, topic_data) => {
  const topic_path = path.resolve(
    __dirname,
    'handlers',
    topic_name
  );

  const topic_processors_names = fs.readdirSync(topic_path);

  const processors = topic_processors_names
    .map(
      processor_name => require(\`./#topics-handlers#/\${topic_name}/\${processor_name}\`)
    );

  Promise.all(processors.map(
    async (processor, index) => {
      try {
        await processor.process(topic_data)
      } catch(error) {
        console.error(
          \`Failed to process topic '\${topic_name}' processor '\${topic_processors_names[index]}'\`,
          error
        );

        const topics = new #topics-table-module#();
  
        await topics.create({
          retrying: false,
          id: randomUUID(),
          times_retried: 0,
          topic: topic_name,
          message: JSON.stringify(topic_data),
          created_at: new Date().toISOString(),
          processor: topic_processors_names[index],
        });

        topics.close();
      }
    }
  ));
}

module.exports = {
  #exports#
}
`;

const topic_publisher_snipped_code = `#topic#: {
    publish: async (data) => topic_handler('#topic#', data)
  }`;

const build_topics = (config) => {
  const topics_handlers_name = 'handlers';
  const project_topics_path = path.resolve(
    config.project_less_resources_location,
    config.less_resources.topics
  );

  if (!fs.existsSync(project_topics_path)) {
    return;
  }

  const topics_handlers = map_dirs_recursive(project_topics_path);
  const topics_path = path.resolve(
    config.chuva_dependency_path,
    config.less_resources.topics
  );

  if (!fs.existsSync(topics_path)) {
    fs.mkdirSync(topics_path, { recursive: true });
  }

  const module_exports = Object
    .keys(topics_handlers)
    .map(
      element => topic_publisher_snipped_code
        .replaceAll('#topic#', element)
    ).join(',\n  ');
  
  const handlers_path = path.resolve(
    topics_path,
    topics_handlers_name
  );

  fs.mkdirSync(handlers_path, { recursive: true });
  fs.writeFileSync(
    topics_path + '/index.js',
    publishers_code
      .replaceAll('#topics-table-module#', `${convert_snake_to_camel_case(config.less_sqlite_tables.topics)}DB`)
      .replaceAll('#database-dependency#', config.sqlite_database_dependency)
      .replaceAll('#topics-handlers#', topics_handlers_name)
      .replace('#exports#', module_exports)
  );
  
  fs.cpSync(
    path.join(
      config.project_less_resources_location,
      config.less_resources.topics
    ),
    handlers_path,
    { recursive: true }
  );
};

export default build_topics;