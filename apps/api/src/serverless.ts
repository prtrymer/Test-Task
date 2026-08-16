import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

/**
 * Entry point for the serverless deployment.
 *
 * The bootstrapped app is cached in module scope. A Vercel function keeps its
 * process alive between invocations, so this pays the Nest startup cost once
 * per cold start rather than once per request.
 */
let cached: Promise<Express> | null = null;

async function create(): Promise<Express> {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    // Serverless logs are per-invocation; the request log adds noise without
    // adding much that the platform does not already record.
    logger: ['error', 'warn'],
  });

  configureApp(app);
  await app.init();

  return server;
}

export function bootstrap(): Promise<Express> {
  cached ??= create();
  return cached;
}
