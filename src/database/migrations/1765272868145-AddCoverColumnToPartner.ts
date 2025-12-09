import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoverColumnToPartner1765272868145 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "coverUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN IF EXISTS "coverUrl"`);
    }

}
