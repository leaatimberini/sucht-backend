import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleReviewStatusToUser1765415474421 implements MigrationInterface {
    name = 'AddGoogleReviewStatusToUser1765415474421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."users_googlereviewstatus_enum" AS ENUM('NONE', 'PENDING_VALIDATION', 'APPROVED', 'REJECTED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleReviewStatus" "public"."users_googlereviewstatus_enum" NOT NULL DEFAULT 'NONE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "googleReviewStatus"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_googlereviewstatus_enum"`);
    }

}
