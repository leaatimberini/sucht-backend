import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateScratchModule1765439121841 implements MigrationInterface {
    name = 'CreateScratchModule1765439121841'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."scratch_prizes_type_enum" AS ENUM('INTERNAL', 'PARTNER', 'NO_WIN')`);
        await queryRunner.query(`CREATE TABLE "scratch_prizes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."scratch_prizes_type_enum" NOT NULL DEFAULT 'INTERNAL', "name" character varying NOT NULL, "description" text, "imageUrl" character varying, "probability" numeric(5,2) NOT NULL DEFAULT '0', "stock" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "partnerId" uuid, "productId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_31a601290ef4f9600db67392f70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "scratch_attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "playedAt" TIMESTAMP NOT NULL DEFAULT now(), "didWin" boolean NOT NULL, "prizeId" uuid, "claimed" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_57a6807e2d55fbb1e8aaa25d9a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "scratch_prizes" ADD CONSTRAINT "FK_135151e73c7555c72d9199264a5" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "scratch_prizes" ADD CONSTRAINT "FK_d687ccf4075e1361476d2a080be" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "scratch_attempts" ADD CONSTRAINT "FK_3f06717652906bf324b570a0912" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "scratch_attempts" ADD CONSTRAINT "FK_c309aebab56befa6b432cda503e" FOREIGN KEY ("prizeId") REFERENCES "scratch_prizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "scratch_attempts" DROP CONSTRAINT "FK_c309aebab56befa6b432cda503e"`);
        await queryRunner.query(`ALTER TABLE "scratch_attempts" DROP CONSTRAINT "FK_3f06717652906bf324b570a0912"`);
        await queryRunner.query(`ALTER TABLE "scratch_prizes" DROP CONSTRAINT "FK_d687ccf4075e1361476d2a080be"`);
        await queryRunner.query(`ALTER TABLE "scratch_prizes" DROP CONSTRAINT "FK_135151e73c7555c72d9199264a5"`);
        await queryRunner.query(`DROP TABLE "scratch_attempts"`);
        await queryRunner.query(`DROP TABLE "scratch_prizes"`);
        await queryRunner.query(`DROP TYPE "public"."scratch_prizes_type_enum"`);
    }

}
