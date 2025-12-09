
import { DataSource } from 'typeorm';
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

async function fixEnum() {
    try {
        await dataSource.initialize();
        console.log('Connected to DB');

        try {
            await dataSource.query(`ALTER TYPE "public"."users_roles_enum" ADD VALUE 'partner'`);
            console.log('Added partner to enum');
        } catch (e) {
            console.log('Error or already exists:', e.message);
        }

        await dataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

fixEnum();
