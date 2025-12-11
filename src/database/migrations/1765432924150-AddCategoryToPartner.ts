import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryToPartner1765432924150 implements MigrationInterface {
    name = 'AddCategoryToPartner1765432924150'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" ADD "category" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "category"`);
    }
}
