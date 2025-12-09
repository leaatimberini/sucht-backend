
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBenefitsClub1765261247074 implements MigrationInterface {
    name = 'CreateBenefitsClub1765261247074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Partners Table with Explicit Constraints
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "partners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "logoUrl" character varying, "address" character varying, "websiteUrl" character varying, "instagramUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "userId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_partners_userId_v2" UNIQUE ("userId"), CONSTRAINT "PK_partners_v2" PRIMARY KEY ("id"))`);

        // Create Benefits Table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "benefits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "conditions" text, "imageUrl" character varying, "validFrom" TIMESTAMP, "validUntil" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "partnerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_benefits_v2" PRIMARY KEY ("id"))`);

        // Create Redemption Status Enum (Check if exists first? Postgres doesn't support IF NOT EXISTS for TYPE easily without block. We'll try. If fail, we skip)
        try {
            await queryRunner.query(`CREATE TYPE "public"."redemptions_status_enum" AS ENUM('pending', 'redeemed', 'expired')`);
        } catch (e) {
            // Ignore if type exists
        }

        // Create Redemptions Table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "redemptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "benefitId" uuid NOT NULL, "userId" uuid NOT NULL, "code" character varying NOT NULL, "status" "public"."redemptions_status_enum" NOT NULL DEFAULT 'pending', "redeemedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_redemptions_code_v2" UNIQUE ("code"), CONSTRAINT "PK_redemptions_v2" PRIMARY KEY ("id"))`);

        // Handle User Roles Enum - Use existing columns if possible or try to update. 
        // Logic: Try to add 'partner' to enum if not exists?
        // Since we can't easily script this in raw SQL across versions, we will rely on TypeORM's swap logic but wrapped/simplified.
        // Actually, let's just use the swap provided by TypeORM but with error handling? No.
        // If users_roles_enum already has partner, we don't need to do anything.
        // Checking via exception...
        /* 
        await queryRunner.query(`ALTER TYPE "public"."users_roles_enum" RENAME TO "users_roles_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_roles_enum" AS ENUM('owner', 'admin', 'organizer', 'rrpp', 'verifier', 'barra', 'client', 'partner')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" TYPE "public"."users_roles_enum"[] USING "roles"::"text"::"public"."users_roles_enum"[]`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT '{client}'`);
        await queryRunner.query(`DROP TYPE "public"."users_roles_enum_old"`);
        */
        // Uncommenting the above is risky if it partially failed before. 
        // Instead, let's just try to ALTER enum to add value?
        try {
            await queryRunner.query(`ALTER TYPE "public"."users_roles_enum" ADD VALUE IF NOT EXISTS 'partner'`);
        } catch (e) {
            // Fallback for older postgres not supporting IF NOT EXISTS in ADD VALUE (pg < 12?)
            // But here we might be on newer.
        }


        // FK Constraints
        // Drop them first to avoid duplicate? No, just ADD
        try {
            await queryRunner.query(`ALTER TABLE "partners" ADD CONSTRAINT "FK_partners_user_v2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        } catch (e) { }

        try {
            await queryRunner.query(`ALTER TABLE "benefits" ADD CONSTRAINT "FK_benefits_partner_v2" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        } catch (e) { }

        try {
            await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_benefit_v2" FOREIGN KEY ("benefitId") REFERENCES "benefits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        } catch (e) { }

        try {
            await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_redemptions_user_v2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        } catch (e) { }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables 
        await queryRunner.query(`DROP TABLE IF EXISTS "redemptions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "benefits"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "partners"`);
        // We don't revert enum type changes to avoid data loss/complexity
    }

}
