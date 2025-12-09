
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

async function checkUserRole() {
    try {
        await dataSource.initialize();
        console.log('Connected to DB');

        const user = await dataSource.query(`SELECT email, roles FROM "users" WHERE email = 'biancastorear@gmail.com'`);
        console.log('User:', user);

        await dataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUserRole();
