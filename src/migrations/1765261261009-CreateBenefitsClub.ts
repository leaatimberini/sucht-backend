import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBenefitsClub1765261261009 implements MigrationInterface {
    name = 'CreateBenefitsClub1765261261009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "partners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "logoUrl" character varying, "address" character varying, "websiteUrl" character varying, "instagramUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "userId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_153a88a7708ead965846a8e048" UNIQUE ("userId"), CONSTRAINT "PK_998645b20820e4ab99aeae03b41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "benefits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "conditions" text, "imageUrl" character varying, "validFrom" TIMESTAMP, "validUntil" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "partnerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f83fd5765028f20487943258b46" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."redemptions_status_enum" AS ENUM('pending', 'redeemed', 'expired')`);
        await queryRunner.query(`CREATE TABLE "redemptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "benefitId" uuid NOT NULL, "userId" uuid NOT NULL, "code" character varying NOT NULL, "status" "public"."redemptions_status_enum" NOT NULL DEFAULT 'pending', "redeemedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d95204b5f1c0f1a3f26247dbd0e" UNIQUE ("code"), CONSTRAINT "PK_def143ab94376fea5985bb04219" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TYPE "public"."users_roles_enum" RENAME TO "users_roles_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_roles_enum" AS ENUM('owner', 'admin', 'organizer', 'rrpp', 'verifier', 'barra', 'client', 'partner')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" TYPE "public"."users_roles_enum"[] USING "roles"::"text"::"public"."users_roles_enum"[]`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT '{client}'`);
        await queryRunner.query(`DROP TYPE "public"."users_roles_enum_old"`);
        await queryRunner.query(`ALTER TABLE "partners" ADD CONSTRAINT "FK_153a88a7708ead965846a8e048b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "benefits" ADD CONSTRAINT "FK_41eda6548686bb2d003355ee626" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_4fca8f573e99165520c46c2cd4c" FOREIGN KEY ("benefitId") REFERENCES "benefits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "redemptions" ADD CONSTRAINT "FK_e660c1ae04d4672daa22dc10c14" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_e660c1ae04d4672daa22dc10c14"`);
        await queryRunner.query(`ALTER TABLE "redemptions" DROP CONSTRAINT "FK_4fca8f573e99165520c46c2cd4c"`);
        await queryRunner.query(`ALTER TABLE "benefits" DROP CONSTRAINT "FK_41eda6548686bb2d003355ee626"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT "FK_153a88a7708ead965846a8e048b"`);
        await queryRunner.query(`CREATE TYPE "public"."users_roles_enum_old" AS ENUM('owner', 'admin', 'organizer', 'rrpp', 'verifier', 'barra', 'client')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" TYPE "public"."users_roles_enum_old"[] USING "roles"::"text"::"public"."users_roles_enum_old"[]`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT '{client}'`);
        await queryRunner.query(`DROP TYPE "public"."users_roles_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_roles_enum_old" RENAME TO "users_roles_enum"`);
        await queryRunner.query(`DROP TABLE "redemptions"`);
        await queryRunner.query(`DROP TYPE "public"."redemptions_status_enum"`);
        await queryRunner.query(`DROP TABLE "benefits"`);
        await queryRunner.query(`DROP TABLE "partners"`);
    }

}
