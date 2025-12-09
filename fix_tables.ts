
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

async function fixTables() {
    try {
        await dataSource.initialize();
        console.log('Connected to DB');

        // Create Enum
        try {
            await dataSource.query(`CREATE TYPE "public"."redemptions_status_enum" AS ENUM('pending', 'redeemed', 'expired')`);
            console.log('Created enum');
        } catch (e) { console.log('Enum likely exists'); }

        // Create partners table
        await dataSource.query(`CREATE TABLE IF NOT EXISTS "partners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "logoUrl" character varying, "address" character varying, "websiteUrl" character varying, "instagramUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "userId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_partners_userId_v2" UNIQUE ("userId"), CONSTRAINT "PK_partners_v2" PRIMARY KEY ("id"))`);
        console.log('Created partners table');
        process.stdout.write('Adding partners FK... ');
        try {
            await dataSource.query(`ALTER TABLE "partners" ADD CONSTRAINT "FK_partners_user_v2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
            console.log('Done');
        } catch (e) { console.log('Exists'); }

        // Create benefits table
        await dataSource.query(`CREATE TABLE IF NOT EXISTS "benefits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "conditions" text, "imageUrl" character varying, "validFrom" TIMESTAMP, "validUntil" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "partnerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_benefits_v2" PRIMARY KEY ("id"))`);
        console.log('Created benefits table');
        process.stdout.write('Adding benefits FK... ');
        try {
            await dataSource.query(`ALTER TABLE "benefits" ADD CONSTRAINT "FK_benefits_partner_v2" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
            console.log('Done');
        } catch (e) { console.log('Exists'); }

        // Create Redemptions
        await dataSource.query(`CREATE TABLE IF NOT EXISTS "redemptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "benefitId" uuid NOT NULL, "userId" uuid NOT NULL, "code" character varying NOT NULL, "status" "public"."redemptions_status_enum" NOT NULL DEFAULT 'pending', "redeemedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_redemptions_code_v2" UNIQUE ("code"), CONSTRAINT "PK_redemptions_v2" PRIMARY KEY ("id"))`);
        console.log('Created redemptions table');
        process.stdout.write('Adding redemptions FK... ');
        try {
            await dataSource.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_benefit_v2" FOREIGN KEY ("benefitId") REFERENCES "benefits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
            await dataSource.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_user_v2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
            console.log('Done');
        } catch (e) { console.log('Exists'); }

        // Create partner_views
        await dataSource.query(`CREATE TABLE IF NOT EXISTS "partner_views"("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "partnerId" uuid NOT NULL, "userId" character varying, "viewedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_partner_views_id_v2" PRIMARY KEY("id"))`);
        console.log('Created partner_views table');

        try {
            await dataSource.query(`ALTER TABLE "partner_views" ADD CONSTRAINT "FK_partner_views_partner_v2" FOREIGN KEY("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
            console.log('Created FK_partner_views_partner_v2');
        } catch (e) {
            console.log('FK already exists or error:', e.message);
        }

        await dataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

fixTables();
