-- AddForeignKey
ALTER TABLE "LikeProfile" ADD FOREIGN KEY ("liked_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
