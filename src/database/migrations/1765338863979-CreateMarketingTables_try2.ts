import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMarketingTables1765338863979 implements MigrationInterface {
    name = ' %npmConfigName%1765338863979'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "marketing_ad_creatives" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "externalId" character varying NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL, "imgUrl" character varying, "bodyText" text, "headline" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "adSetId" uuid, CONSTRAINT "PK_e3b1f04c39576adfa5757b446e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "marketing_ad_sets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "externalId" character varying NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL, "targeting" jsonb, "startTime" TIMESTAMP, "endTime" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "campaignId" uuid, CONSTRAINT "PK_26c3c544834cec0de2aa19764ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "marketing_campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "externalId" character varying NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL, "objective" character varying NOT NULL, "dailyBudget" numeric(10,2), "lifetimeBudget" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid, CONSTRAINT "PK_2601ceb29654c2a8adfddf2abbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "marketing_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "platform" character varying NOT NULL, "name" character varying NOT NULL, "accountId" character varying NOT NULL, "accessToken" character varying, "refreshToken" character varying, "tokenExpiresAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c199a3fba9308690537b1d8843d" PRIMARY KEY ("id"))`);

        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" ADD CONSTRAINT "FK_c4bed22a83e75a4f1c100e448a0" FOREIGN KEY ("adSetId") REFERENCES "marketing_ad_sets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_sets" ADD CONSTRAINT "FK_dfab95c9b906fc4adf8bd1b41d0" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "FK_6b0aec2703313d51b4b07b6acae" FOREIGN KEY ("accountId") REFERENCES "marketing_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "marketing_campaigns" DROP CONSTRAINT "FK_6b0aec2703313d51b4b07b6acae"`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_sets" DROP CONSTRAINT "FK_dfab95c9b906fc4adf8bd1b41d0"`);
        await queryRunner.query(`ALTER TABLE "marketing_ad_creatives" DROP CONSTRAINT "FK_c4bed22a83e75a4f1c100e448a0"`);
        await queryRunner.query(`DROP TABLE "marketing_accounts"`);
        await queryRunner.query(`DROP TABLE "marketing_campaigns"`);
        await queryRunner.query(`DROP TABLE "marketing_ad_sets"`);
        await queryRunner.query(`DROP TABLE "marketing_ad_creatives"`);
    }

}
