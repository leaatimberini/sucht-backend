import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRewardId1765443378182 implements MigrationInterface {
    name = 'AddRewardId1765443378182'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "scratch_prizes" ADD "rewardId" uuid`);
        await queryRunner.query(`ALTER TABLE "scratch_prizes" ADD CONSTRAINT "FK_f8f00fcd81edcfa6145d7a145f9" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "scratch_prizes" DROP CONSTRAINT "FK_f8f00fcd81edcfa6145d7a145f9"`);
        await queryRunner.query(`ALTER TABLE "scratch_prizes" DROP COLUMN "rewardId"`);
    }

}
