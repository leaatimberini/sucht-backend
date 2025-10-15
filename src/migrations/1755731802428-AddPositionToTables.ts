import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPositionToTables1755731802428 implements MigrationInterface {
    name = 'AddPositionToTables1755731802428'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "is_free"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "is_paid"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "isFree"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "isPaid"`);
        await queryRunner.query(`ALTER TABLE "tables" ADD "positionX" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "tables" ADD "positionY" numeric(5,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tables" DROP COLUMN "positionY"`);
        await queryRunner.query(`ALTER TABLE "tables" DROP COLUMN "positionX"`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "isPaid" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "isFree" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "is_paid" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "is_free" boolean NOT NULL DEFAULT false`);
    }

}
