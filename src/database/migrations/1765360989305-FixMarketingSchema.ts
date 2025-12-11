import { MigrationInterface, QueryRunner } from "typeorm";

export class FixMarketingSchema1765360989305 implements MigrationInterface {
    name = 'FixMarketingSchema1765360989305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop constraints if they exist
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "partners" DROP CONSTRAINT IF EXISTS "FK_partners_user_v2"; EXCEPTION WHEN undefined_object THEN null; END $$;`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "partner_views" DROP CONSTRAINT IF EXISTS "FK_partner_views_partner_v2"; EXCEPTION WHEN undefined_object THEN null; END $$;`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "benefits" DROP CONSTRAINT IF EXISTS "FK_benefits_partner_v2"; EXCEPTION WHEN undefined_object THEN null; END $$;`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "redemptions" DROP CONSTRAINT IF EXISTS "FK_redemptions_user_v2"; EXCEPTION WHEN undefined_object THEN null; END $$;`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "redemptions" DROP CONSTRAINT IF EXISTS "FK_redemptions_benefit_v2"; EXCEPTION WHEN undefined_object THEN null; END $$;`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "marketing_optimization_logs" DROP CONSTRAINT IF EXISTS "FK_cf8c84c50924a135419a2e595fc"; EXCEPTION WHEN undefined_object THEN null; END $$;`);

        // Add columns if not exist
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "spend" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "impressions" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "clicks" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "ctr" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD COLUMN IF NOT EXISTS "roas" double precision NOT NULL DEFAULT '0'`);

        // Types and Enums
        await queryRunner.query(`DO $$ BEGIN ALTER TYPE "public"."partner_status_enum" RENAME TO "partner_status_enum_old"; EXCEPTION WHEN undefined_object THEN null; WHEN duplicate_object THEN null; END $$;`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."partners_status_enum" AS ENUM('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

        // Alter columns safely
        try { await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "status" DROP DEFAULT`); } catch (e) { }
        try { await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "status" TYPE "public"."partners_status_enum" USING "status"::"text"::"public"."partners_status_enum"`); } catch (e) { }
        try { await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "status" SET DEFAULT 'approved'`); } catch (e) { }

        await queryRunner.query(`DO $$ BEGIN DROP TYPE IF EXISTS "public"."partner_status_enum_old"; EXCEPTION WHEN undefined_object THEN null; END $$;`);

        try { await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "status" SET NOT NULL`); } catch (e) { }

        try { await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "instagram"`); } catch (e) { }
        await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "instagram" character varying`);

        await queryRunner.query(`DO $$ BEGIN ALTER TYPE "public"."job_application_status_enum" RENAME TO "job_application_status_enum_old"; EXCEPTION WHEN undefined_object THEN null; WHEN duplicate_object THEN null; END $$;`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."job_applications_status_enum" AS ENUM('pending', 'reviewed', 'contacted', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

        try { await queryRunner.query(`ALTER TABLE "job_applications" ALTER COLUMN "status" DROP DEFAULT`); } catch (e) { }
        try { await queryRunner.query(`ALTER TABLE "job_applications" ALTER COLUMN "status" TYPE "public"."job_applications_status_enum" USING "status"::"text"::"public"."job_applications_status_enum"`); } catch (e) { }
        try { await queryRunner.query(`ALTER TABLE "job_applications" ALTER COLUMN "status" SET DEFAULT 'pending'`); } catch (e) { }

        await queryRunner.query(`DO $$ BEGIN DROP TYPE IF EXISTS "public"."job_application_status_enum_old"; EXCEPTION WHEN undefined_object THEN null; END $$;`);

        try { await queryRunner.query(`ALTER TABLE "marketing_accounts" ALTER COLUMN "currency" SET NOT NULL`); } catch (e) { }
        try { await queryRunner.query(`ALTER TABLE "marketing_campaigns" ALTER COLUMN "budgetType" SET NOT NULL`); } catch (e) { }

        // Re-add constraints (might fail if duplicate, wrap in DO block)
        const constraints = [
            `ALTER TABLE "partners" ADD CONSTRAINT "FK_153a88a7708ead965846a8e048b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
            `ALTER TABLE "partner_views" ADD CONSTRAINT "FK_dac307b682f1946b9ca7cda171f" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            `ALTER TABLE "benefits" ADD CONSTRAINT "FK_41eda6548686bb2d003355ee626" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            `ALTER TABLE "redemptions" ADD CONSTRAINT "FK_4fca8f573e99165520c46c2cd4c" FOREIGN KEY ("benefitId") REFERENCES "benefits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            `ALTER TABLE "redemptions" ADD CONSTRAINT "FK_e660c1ae04d4672daa22dc10c14" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            `ALTER TABLE "marketing_optimization_logs" ADD CONSTRAINT "FK_cf8c84c50924a135419a2e595fc" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        ];

        for (const sql of constraints) {
            try { await queryRunner.query(sql); } catch (e) {
                // Ignore "already exists" errors
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" DROP CONSTRAINT "FK_cf8c84c50924a135419a2e595fc"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_e660c1ae04d4672daa22dc10c14"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_4fca8f573e99165520c46c2cd4c"`);
        await queryRunner.query(`ALTER TABLE "benefits" DROP CONSTRAINT "FK_41eda6548686bb2d003355ee626"`);
        await queryRunner.query(`ALTER TABLE "partner_views" DROP CONSTRAINT "FK_dac307b682f1946b9ca7cda171f"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT "FK_153a88a7708ead965846a8e048b"`);
        await queryRunner.query(`ALTER TABLE "marketing_campaigns" ALTER COLUMN "budgetType" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "marketing_accounts" ALTER COLUMN "currency" DROP NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."job_application_status_enum_old" AS ENUM('pending', 'reviewed', 'contacted', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "job_applications" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "job_applications" ALTER COLUMN "status" TYPE "public"."job_application_status_enum_old" USING "status"::"text"::"public"."job_application_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "job_applications" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."job_applications_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."job_application_status_enum_old" RENAME TO "job_application_status_enum"`);
        await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN "instagram"`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD "instagram" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "status" DROP NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."partner_status_enum_old" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "status" TYPE "public"."partner_status_enum_old" USING "status"::"text"::"public"."partner_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "partners" ALTER COLUMN "status" SET DEFAULT 'approved'`);
        await queryRunner.query(`DROP TYPE "public"."partners_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."partner_status_enum_old" RENAME TO "partner_status_enum"`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" DROP COLUMN "roas"`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" DROP COLUMN "ctr"`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" DROP COLUMN "clicks"`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" DROP COLUMN "impressions"`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" DROP COLUMN "spend"`);
        await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" ADD CONSTRAINT "FK_cf8c84c50924a135419a2e595fc" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_benefit_v2" FOREIGN KEY ("benefitId") REFERENCES "benefits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_user_v2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "benefits" ADD CONSTRAINT "FK_benefits_partner_v2" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_views" ADD CONSTRAINT "FK_partner_views_partner_v2" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partners" ADD CONSTRAINT "FK_partners_user_v2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
