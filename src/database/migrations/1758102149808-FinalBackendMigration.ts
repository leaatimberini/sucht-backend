import { MigrationInterface, QueryRunner } from "typeorm";

export class FinalBackendMigration1758102149808 implements MigrationInterface {
    name = 'FinalBackendMigration1758102149808'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD "tableNumber" integer`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD "capacity" integer`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD "location" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP CONSTRAINT "FK_a9059a9111a2206081a347d3b6e"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ALTER COLUMN "eventId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD CONSTRAINT "FK_a9059a9111a2206081a347d3b6e" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP CONSTRAINT "FK_a9059a9111a2206081a347d3b6e"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ALTER COLUMN "eventId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD CONSTRAINT "FK_a9059a9111a2206081a347d3b6e" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP COLUMN "capacity"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP COLUMN "tableNumber"`);
    }

}
