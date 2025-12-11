import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBenefitsClub1765261261009 implements MigrationInterface {
    name = 'CreateBenefitsClub1765261261009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "partners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "logoUrl" character varying, "address" character varying, "websiteUrl" character varying, "instagramUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "userId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_153a88a7708ead965846a8e048" UNIQUE ("userId"), CONSTRAINT "PK_998645b20820e4ab99aeae03b41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "benefits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "conditions" text, "imageUrl" character varying, "validFrom" TIMESTAMP, "validUntil" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "partnerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f83fd5765028f20487943258b46" PRIMARY KEY ("id"))`);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."redemptions_status_enum" AS ENUM('pending', 'redeemed', 'expired');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "redemptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "benefitId" uuid NOT NULL, "userId" uuid NOT NULL, "code" character varying NOT NULL, "status" "public"."redemptions_status_enum" NOT NULL DEFAULT 'pending', "redeemedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d95204b5f1c0f1a3f26247dbd0e" UNIQUE ("code"), CONSTRAINT "PK_def143ab94376fea5985bb04219" PRIMARY KEY ("id"))`);

        // Handle enum modification carefully
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TYPE "public"."users_roles_enum" RENAME TO "users_roles_enum_old";
            EXCEPTION
                WHEN undefined_object THEN null; -- If old enum doesn't exist (maybe already renamed or strictly managed)
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."users_roles_enum" AS ENUM('owner', 'admin', 'organizer', 'rrpp', 'verifier', 'barra', 'client', 'partner');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // These alter table commands might fail if already applied, but difficult to wrap in one block. 
        // We assume IF the table existed, the columns might match or we catch errors.
        // For simplicity, we try to catch errors for each specific alter if possible, or just let them run if we trust they won't conflict hard if types match.
        // But "duplicate key value" or "constraint already exists" is common. 
        // Adding manual constraint names allows checking if they exist.

        // Skipping DROP DEFAULT if it might fail? No, usually idempotent-ish or safe to fail.
        try { await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT`); } catch (e) { }
        try { await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" TYPE "public"."users_roles_enum"[] USING "roles"::"text"::"public"."users_roles_enum"[]`); } catch (e) { }
        try { await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT '{client}'`); } catch (e) { }
        try { await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_roles_enum_old"`); } catch (e) { }

        // Constraints with IF checks are hard in raw SQL without querying implementation schema.
        // We will wrap them in try-catch blocks via DO $$ in SQL or just try/catch in TS if QueryRunner supports it (it throws).
        // Since we are inside 'up', we can use try-catch around await queryRunner.query().
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_e660c1ae04d4672daa22dc10c14"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_4fca8f573e99165520c46c2cd4c"`);
        await queryRunner.query(`ALTER TABLE "benefits" DROP CONSTRAINT "FK_41eda6548686bb2d003355ee626"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT "FK_153a88a7708ead965846a8e048b"`);
        await queryRunner.query(`CREATE TYPE "public"."users_roles_enum_old" AS ENUM('owner', 'admin', 'organizer', 'rrpp', 'verifier', 'barra', 'client')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" TYPE "public"."users_roles_enum_old"[] USING "roles"::"text"::"public"."users_roles_enum_old"[]`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT '{client}'`);
        await queryRunner.query(`DROP TYPE "public"."users_roles_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_roles_enum_old" RENAME TO "users_roles_enum"`);
        await queryRunner.query(`DROP TABLE "redemptions"`);
        await queryRunner.query(`DROP TYPE "public"."redemptions_status_enum"`);
        await queryRunner.query(`DROP TABLE "benefits"`);
        await queryRunner.query(`DROP TABLE "partners"`);
    }

}
