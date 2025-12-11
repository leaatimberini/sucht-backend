
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

const dataSource = new DataSource(dataSourceOptions);

async function runFix() {
    console.log('Connecting to DB...');
    await dataSource.initialize();
    console.log('Connected.');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        console.log(' applying Schema Fixes...');

        // 1. Add missing attributes to AdCreatives (Safe Add)
        console.log('Adding columns to marketing_ad_creatives...');
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "spend" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "impressions" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "clicks" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "ctr" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "roas" double precision NOT NULL DEFAULT '0'`);

        // 2. Fix Optimization Log Constraint (Campaign ID & Cascade)
        // First check if column exists, if not add it (Wait, migration added constraint on campaignId column)
        // If the column `campaignId` was missing (as per my suspicion), we need to ensure it exists.
        // TypeORM usually adds it if it's part of relation.
        // Let's force add it if missing.
        // Actually, if we add the FK, the column must exist.
        // The migration code:
        // await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" ADD CONSTRAINT "FK_..." FOREIGN KEY ("campaignId") ...`);
        // implies "campaignId" column is expected.

        // Let's try to add the column first just in case.
        // Note: relation column adds UUID type usually.
        await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" ADD COLUMN IF NOT EXISTS "campaignId" uuid`);

        // Drop old constraint if exists (we try standard name or just ignore error if not found? Safer to try drop)
        try {
            await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" DROP CONSTRAINT "FK_marketing_optimization_logs_campaign"`); // Guessing
            await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" DROP CONSTRAINT "FK_cf8c84c50924a135419a2e595fc"`); // TypeORM name
        } catch (e) {
            console.log('Constraint drop failed (maybe didn\'t exist), continuing...');
        }

        // Add correct Cascade Constraint
        console.log('Adding Cascade Constraint to Optimization Log...');
        await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" ADD CONSTRAINT "FK_cf8c84c50924a135419a2e595fc" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        console.log('✅ Fixes applied successfully.');

    } catch (error) {
        console.error('Error applying fixes:', error);
    } finally {
        await queryRunner.release();
        await dataSource.destroy();
    }
}

runFix();
