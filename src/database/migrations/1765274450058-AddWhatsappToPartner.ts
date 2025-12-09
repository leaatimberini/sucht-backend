import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWhatsappToPartner1765274450058 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "whatsapp" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN IF EXISTS "whatsapp"`);
    }

}
