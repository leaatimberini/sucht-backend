import { MigrationInterface, QueryRunner } from "typeorm";

export class LinkTicketRewards1765190258908 implements MigrationInterface {
    name = 'LinkTicketRewards1765190258908'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD "linkedRewardId" uuid`);
        await queryRunner.query(`ALTER TABLE "user_rewards" ADD "ticketId" uuid`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD CONSTRAINT "FK_a7deb433242380766d726be68c8" FOREIGN KEY ("linkedRewardId") REFERENCES "rewards"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_rewards" ADD CONSTRAINT "FK_aead5c4176d03256753026e8c24" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_rewards" DROP CONSTRAINT "FK_aead5c4176d03256753026e8c24"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP CONSTRAINT "FK_a7deb433242380766d726be68c8"`);
        await queryRunner.query(`ALTER TABLE "user_rewards" DROP COLUMN "ticketId"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP COLUMN "linkedRewardId"`);
    }

}
