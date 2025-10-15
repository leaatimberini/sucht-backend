import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaloFieldsToUser1756249074993 implements MigrationInterface {
    name = 'AddTaloFieldsToUser1756249074993'

public async up(queryRunner: QueryRunner): Promise<void> {
    // Añade las nuevas columnas a la tabla 'users'
    await queryRunner.query(`ALTER TABLE "users" ADD "taloAccessToken" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "taloRefreshToken" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "taloUserId" character varying`);

    // Proceso seguro para actualizar la tabla 'configurations'
    await queryRunner.query(`ALTER TABLE "configurations" ALTER COLUMN "value" TYPE text`);
    await queryRunner.query(`UPDATE "configurations" SET "value" = '' WHERE "value" IS NULL`);
    await queryRunner.query(`ALTER TABLE "configurations" ALTER COLUMN "value" SET NOT NULL`);
}

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "configurations" DROP COLUMN "value"`);
        await queryRunner.query(`ALTER TABLE "configurations" ADD "value" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "taloUserId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "taloRefreshToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "taloAccessToken"`);
    }

}
