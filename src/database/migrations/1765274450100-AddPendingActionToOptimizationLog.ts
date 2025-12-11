import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPendingActionToOptimizationLog1765123456789 implements MigrationInterface {
    name = 'AddPendingActionToOptimizationLog1765123456789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" ADD "pendingAction" character varying`);
        await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" ADD "uploadToken" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" DROP COLUMN "uploadToken"`);
        await queryRunner.query(`ALTER TABLE "marketing_optimization_logs" DROP COLUMN "pendingAction"`);
    }
}
