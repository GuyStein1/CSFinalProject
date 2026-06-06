-- CreateIndex
CREATE INDEX "Bid_task_id_idx" ON "Bid"("task_id");

-- CreateIndex
CREATE INDEX "Bid_fixer_id_idx" ON "Bid"("fixer_id");

-- CreateIndex
CREATE INDEX "Bid_status_idx" ON "Bid"("status");

-- CreateIndex
CREATE INDEX "Message_task_id_idx" ON "Message"("task_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_is_read_idx" ON "Notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "Review_reviewee_id_idx" ON "Review"("reviewee_id");
