import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveIsVipAccessFromTicket1757955171094 implements MigrationInterface {
    name = 'RemoveIsVipAccessFromTicket1757955171094'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "isVipAccess"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" ADD "isVipAccess" boolean NOT NULL DEFAULT false`);
    }

}
