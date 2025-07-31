import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Carga las variables de entorno desde el archivo .env
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  // Le decimos a TypeORM dónde encontrar las entidades
  entities: ['dist/**/*.entity{.ts,.js}'],
  // Le decimos a TypeORM dónde encontrar y guardar las migraciones
  migrations: ['dist/database/migrations/*{.ts,.js}'],
  // Sincronize debe estar en false para que las migraciones funcionen
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;