import { readFile } from 'node:fs/promises';

import { watch } from 'chokidar';
import { z } from 'zod';

const configPath = process.env['CONFIG_FILE'] ?? './config.json';

const configSchema = z.object({
  rounds: z.number(),
  environment: z.string(),
  version: z.string(),
  dbType: z.enum(['sqlite', 'postgresql']),
  sqliteDbPath: z.string().optional(),
  postgresHost: z.string(),
  postgresUser: z.string(),
  postgresDb: z.string(),
});

type Config = z.infer<typeof configSchema>;

const defaultConfig: Config = {
  rounds: 10,
  environment: 'development',
  version: process.env['VERSION'] ?? 'N/A',
  dbType: 'sqlite',
  postgresHost: 'example-app',
  postgresUser: 'example-app',
  postgresDb: 'example-app',
};

const configData = await readFile(configPath, { encoding: 'utf8' });

export const config: Config = configSchema.parse({
  ...defaultConfig,
  ...JSON.parse(configData),
});

console.log('config:', config);

export function watchConfig(): void {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watch(configPath).on('change', async () => {
    console.log('config changed');
    try {
      const configData = await readFile(configPath, { encoding: 'utf8' });
      const newConfig = configSchema.parse({
        ...defaultConfig,
        ...JSON.parse(configData),
      });
      Object.keys(config).forEach((key) => {
        delete (config as Partial<Config>)[key as keyof Config];
      });
      Object.assign(config, newConfig);
      console.log('new config:', config);
    } catch (err) {
      console.error('config read error:', err);
    }
  });
}
