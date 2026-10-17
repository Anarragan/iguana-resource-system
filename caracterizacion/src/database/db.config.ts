
import {
  Logger,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        synchronize: false,
        autoLoadEntities: true,
        // Sin 'error': TypeORM registraría la consulta fallida CON sus parámetros (nombres, direcciones, teléfonos).
        logging: ['warn'],
        // DATABASE_SSL=disable solo para una base local; DATABASE_SSL_STRICT=true valida el certificado del servidor.
        ssl:
          config.get('DATABASE_SSL') === 'disable'
            ? false
            : { rejectUnauthorized: config.get('DATABASE_SSL_STRICT') === 'true' },
        extra: {
          max: 3,
          connectionTimeoutMillis: 10000,
          statement_timeout: 30000,
        },
        retryAttempts: 3,
        retryDelay: 2000,
        verboseRetryLog: true,
      }),
    }),
  ],
})
export class DatabaseConfigModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseConfigModule.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `DataSource inicializado: ${this.dataSource.isInitialized}`,
    );

    const resultado = await this.dataSource.query('SELECT 1 AS prueba');

    this.logger.log(
      `Consulta de prueba exitosa: ${JSON.stringify(resultado)}`,
    );

    const tablas = await this.dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    this.logger.log(
      `Tablas encontradas: ${JSON.stringify(
        tablas.map((tabla: { table_name: string }) => tabla.table_name),
      )}`,
    );
  }
}
