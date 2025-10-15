import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaFinalV51758133622519 implements MigrationInterface {
    name = 'SchemaFinalV51758133622519'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD "isPubliclyListed" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP COLUMN "isPubliclyListed"`);
    }

}
