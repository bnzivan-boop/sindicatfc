-- CreateTable
CREATE TABLE "catch_likes" (
    "catch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catch_likes_pkey" PRIMARY KEY ("catch_id","user_id")
);

-- CreateTable
CREATE TABLE "catch_comments" (
    "id" TEXT NOT NULL,
    "catch_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catch_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catch_comments_catch_id_created_at_idx" ON "catch_comments"("catch_id", "created_at");

-- AddForeignKey
ALTER TABLE "catch_likes" ADD CONSTRAINT "catch_likes_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_likes" ADD CONSTRAINT "catch_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_comments" ADD CONSTRAINT "catch_comments_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_comments" ADD CONSTRAINT "catch_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
