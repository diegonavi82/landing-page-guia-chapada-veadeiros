ALTER TABLE gcv_guides
  ADD COLUMN needs_resubmit TINYINT(1) NOT NULL DEFAULT 0 AFTER profile_complete;
