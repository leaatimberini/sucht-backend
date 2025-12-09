// backend/src/data-source.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  // FIX: Apuntamos a los archivos .js compilados en la carpeta 'dist'.
  // Esta es la configuración correcta para un entorno de producción/staging.
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/**/migrations/*.js'],

  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource; // Exportamos como default para la CLI