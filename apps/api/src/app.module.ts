import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { SharedModule } from './shared/shared.module';
import { DataRoomModule } from './modules/data-room/data-room.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CallerMiddleware } from './modules/identity/interface/http/caller.middleware';
import { SharingModule } from './modules/sharing/sharing.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    SharedModule,
    PrismaModule,
    IdentityModule,
    StorageModule,
    DataRoomModule,
    SharingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CallerMiddleware).forRoutes('*');
  }
}
