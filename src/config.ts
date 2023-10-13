import { readFile } from 'node:fs/promises';

import { watch } from 'chokidar';
import { z } from 'zod';

const configPath = process.env['CONFIG_FILE'] ?? './config.json';

const configSchema = z.object({
  rounds: z.number(),
  environment: z.string(),
  version: z.string(),
});

type Config = z.infer<typeof configSchema>;

const configData = await readFile(configPath, { encoding: 'utf8' });

export const config: Config = configSchema.parse({
  ...JSON.parse(configData),
  version: process.env['VERSION'] ?? 'N/A',
});

console.log('config:', config);

/*
const watcher = watch(configPath);
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async function (): Promise<void> {
  for await (const event of watcher) {
    console.log(event);
  }
})();
*/

export function watchConfig(): void {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watch(configPath).on('change', async () => {
    console.log('config changed');
    try {
      const configData = await readFile(configPath, { encoding: 'utf8' });
      const newConfig = configSchema.parse({
        ...JSON.parse(configData),
        version: process.env['VERSION'] ?? 'N/A',
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
