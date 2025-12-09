import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTableCategoryIdToTicketTier1765228055029 implements MigrationInterface {
    name = 'AddTableCategoryIdToTicketTier1765228055029'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD "tableCategoryId" uuid`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD CONSTRAINT "FK_d6ccfbd22504a0664902a524aa2" FOREIGN KEY ("tableCategoryId") REFERENCES "table_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP CONSTRAINT "FK_d6ccfbd22504a0664902a524aa2"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP COLUMN "tableCategoryId"`);
    }

}
