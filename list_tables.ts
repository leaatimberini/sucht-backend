
import { DataSource } from 'typeorm';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config();

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'sucht',
    entities: [],
    synchronize: false,
});

async function listTables() {
    try {
        await dataSource.initialize();
        console.log('Connected to DB');
        const result = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
        console.log('Tables in public schema:');
        result.forEach((row: any) => console.log(row.table_name));
        await dataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

listTables();
