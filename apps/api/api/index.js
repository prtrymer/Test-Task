/*
 * Vercel function entry.
 *
 * Deliberately plain JavaScript and deliberately thin. Vercel bundles function
 * sources with esbuild, which does not emit the `design:paramtypes` metadata
 * that Nest's dependency injection reads — bundling the decorated source here
 * would produce an app that builds cleanly and then fails to resolve a single
 * provider at runtime. Everything decorated is compiled ahead of time by tsc
 * (see the vercel-build script) and loaded from dist/.
 */
const { bootstrap } = require('../dist/serverless');

module.exports = async function handler(req, res) {
  const app = await bootstrap();
  return app(req, res);
};
