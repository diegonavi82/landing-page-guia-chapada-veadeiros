-- Recusa de cadastro novo: perfil permanece; nova solicitação só após 45 dias.
ALTER TABLE gcv_guides
  ADD COLUMN rejected_at DATETIME NULL AFTER approved_by,
  ADD COLUMN rejected_reason VARCHAR(500) NULL AFTER rejected_at,
  ADD COLUMN rejected_by INT UNSIGNED NULL AFTER rejected_reason;
