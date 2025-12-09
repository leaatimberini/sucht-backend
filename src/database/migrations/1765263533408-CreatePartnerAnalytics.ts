
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePartnerAnalytics1765263533408 implements MigrationInterface {
    name = 'CreatePartnerAnalytics1765263533408'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "partner_views"("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "partnerId" uuid NOT NULL, "userId" character varying, "viewedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_partner_views_id_v2" PRIMARY KEY("id"))`);
        try {
            await queryRunner.query(`ALTER TABLE "partner_views" ADD CONSTRAINT "FK_partner_views_partner_v2" FOREIGN KEY("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        } catch (e) { }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_views" DROP CONSTRAINT "FK_dac307b682f1946b9ca7cda171f"`);
        await queryRunner.query(`DROP TABLE "partner_views"`);
    }

}
