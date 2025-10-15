import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduledPublishingToEvents1755671615451 implements MigrationInterface {
    name = 'AddScheduledPublishingToEvents1755671615451'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."table_reservations_paymenttype_enum" AS ENUM('full', 'deposit', 'gift')`);
        await queryRunner.query(`CREATE TABLE "table_reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" uuid NOT NULL, "tableId" uuid NOT NULL, "clientName" character varying NOT NULL, "clientEmail" character varying, "reservedByUserId" uuid NOT NULL, "paymentType" "public"."table_reservations_paymenttype_enum" NOT NULL, "totalPrice" numeric(10,2) NOT NULL, "amountPaid" numeric(10,2) NOT NULL, "guestCount" integer NOT NULL, "ticketId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_079948f33232006f4b7f4f832c" UNIQUE ("ticketId"), CONSTRAINT "PK_2b82b9381ad0a74bebc85b98b24" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
        await queryRunner.query(`CREATE TYPE "public"."users_roles_enum" AS ENUM('owner', 'admin', 'organizer', 'rrpp', 'verifier', 'barra', 'client')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "roles" "public"."users_roles_enum" array NOT NULL DEFAULT '{client}'`);
        await queryRunner.query(`ALTER TABLE "table_reservations" ADD CONSTRAINT "FK_fdede5a30cdd3253d3e1517dea5" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "table_reservations" ADD CONSTRAINT "FK_0dcdd2e36f14c33de46893039f5" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "table_reservations" ADD CONSTRAINT "FK_1ded2e88b5cd4098ee41ad35559" FOREIGN KEY ("reservedByUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "table_reservations" ADD CONSTRAINT "FK_079948f33232006f4b7f4f832c5" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "table_reservations" DROP CONSTRAINT "FK_079948f33232006f4b7f4f832c5"`);
        await queryRunner.query(`ALTER TABLE "table_reservations" DROP CONSTRAINT "FK_1ded2e88b5cd4098ee41ad35559"`);
        await queryRunner.query(`ALTER TABLE "table_reservations" DROP CONSTRAINT "FK_0dcdd2e36f14c33de46893039f5"`);
        await queryRunner.query(`ALTER TABLE "table_reservations" DROP CONSTRAINT "FK_fdede5a30cdd3253d3e1517dea5"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
        await queryRunner.query(`DROP TYPE "public"."users_roles_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "roles" text NOT NULL DEFAULT 'client'`);
        await queryRunner.query(`DROP TABLE "table_reservations"`);
        await queryRunner.query(`DROP TYPE "public"."table_reservations_paymenttype_enum"`);
    }

}
