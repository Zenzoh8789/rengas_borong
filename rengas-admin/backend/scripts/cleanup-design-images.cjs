// Lists unused single-image uploads by default. --apply deletes the listed files.
require('reflect-metadata');
const { readdir } = require('node:fs/promises');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { FeaturesService } = require('../dist/features/features');
const { getUploadDirectory } = require('../dist/storage');
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const service = app.get(FeaturesService);
    const apply = process.argv.includes('--apply');
    let count = 0;
    for (const file of await readdir(getUploadDirectory(), { withFileTypes: true })) {
      if (!file.isFile() || !/^\d+-\d+\.jpg$/.test(file.name)) continue;
      const url = `/uploads/${file.name}`;
      if (await service.removeUnusedDesignFile(url, !apply)) {
        console.log(`${apply ? 'Deleted' : 'Unused'}: ${file.name}`);
        count++;
      }
    }
    console.log(`${count} unused file(s). ${apply ? 'Cleanup complete.' : 'Review this list; run with --apply to delete.'}`);
  } finally { await app.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
