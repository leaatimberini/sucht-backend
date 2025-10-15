import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsVipToTicketTier1757947040662 implements MigrationInterface {
    name = 'AddIsVipToTicketTier1757947040662'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD "isVip" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP COLUMN "isVip"`);
    }

}
