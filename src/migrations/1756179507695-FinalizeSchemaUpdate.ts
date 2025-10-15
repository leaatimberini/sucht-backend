import { MigrationInterface, QueryRunner } from "typeorm";

export class FinalizeSchemaUpdate1756179507695 implements MigrationInterface {
    name = 'FinalizeSchemaUpdate1756179507695'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP CONSTRAINT "FK_12ae21e9f1f3305a06a9c1c6115"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP CONSTRAINT "FK_302476e6562e5d0f25fdd0eab1d"`);
        await queryRunner.query(`CREATE TABLE "raffle_prizes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "raffleId" uuid NOT NULL, "productId" uuid NOT NULL, "prizeRank" integer NOT NULL, CONSTRAINT "PK_148fb5e8f931152c22d42437d4b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."raffles_status_enum" AS ENUM('pending', 'completed')`);
        await queryRunner.query(`CREATE TABLE "raffles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" uuid NOT NULL, "drawDate" TIMESTAMP WITH TIME ZONE NOT NULL, "numberOfWinners" integer NOT NULL DEFAULT '1', "status" "public"."raffles_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_caa68c5266f62db88921524e540" UNIQUE ("eventId"), CONSTRAINT "REL_caa68c5266f62db88921524e54" UNIQUE ("eventId"), CONSTRAINT "PK_052c636fce78a0481c29fab2aa1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP COLUMN "drawnAt"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP COLUMN "eventId"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP COLUMN "winnerUserId"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD "raffleId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD "prizeId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ADD "cbu" character varying(22)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordResetToken" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordResetExpires" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "raffle_prizes" ADD CONSTRAINT "FK_79beb547e04500aad8f970c7145" FOREIGN KEY ("raffleId") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raffle_prizes" ADD CONSTRAINT "FK_1d16f952ee27e0b59717aaafb34" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD CONSTRAINT "FK_80ac59c92337f8d14ec0aab724c" FOREIGN KEY ("raffleId") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD CONSTRAINT "FK_5519d9e65ca94e63a1debea96f6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD CONSTRAINT "FK_af89cf02b7c45bb9d0fc370f5e4" FOREIGN KEY ("prizeId") REFERENCES "raffle_prizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raffles" ADD CONSTRAINT "FK_caa68c5266f62db88921524e540" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "raffles" DROP CONSTRAINT "FK_caa68c5266f62db88921524e540"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP CONSTRAINT "FK_af89cf02b7c45bb9d0fc370f5e4"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP CONSTRAINT "FK_5519d9e65ca94e63a1debea96f6"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP CONSTRAINT "FK_80ac59c92337f8d14ec0aab724c"`);
        await queryRunner.query(`ALTER TABLE "raffle_prizes" DROP CONSTRAINT "FK_1d16f952ee27e0b59717aaafb34"`);
        await queryRunner.query(`ALTER TABLE "raffle_prizes" DROP CONSTRAINT "FK_79beb547e04500aad8f970c7145"`);
        await queryRunner.query(`ALTER TABLE "configurations" DROP COLUMN "value"`);
        await queryRunner.query(`ALTER TABLE "configurations" ADD "value" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tables" DROP COLUMN "positionY"`);
        await queryRunner.query(`ALTER TABLE "tables" DROP COLUMN "positionX"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordResetExpires"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordResetToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "cbu"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP COLUMN "prizeId"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" DROP COLUMN "raffleId"`);
        await queryRunner.query(`ALTER TABLE "ticket_tiers" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "is_free" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "is_paid" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "isFree" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "isPaid" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD "winnerUserId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD "eventId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD "drawnAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`DROP TABLE "raffles"`);
        await queryRunner.query(`DROP TYPE "public"."raffles_status_enum"`);
        await queryRunner.query(`DROP TABLE "raffle_prizes"`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD CONSTRAINT "FK_302476e6562e5d0f25fdd0eab1d" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raffle_winners" ADD CONSTRAINT "FK_12ae21e9f1f3305a06a9c1c6115" FOREIGN KEY ("winnerUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
