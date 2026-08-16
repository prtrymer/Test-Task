import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

let cached: Promise<Express> | null = null;

async function create(): Promise<Express> {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
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
