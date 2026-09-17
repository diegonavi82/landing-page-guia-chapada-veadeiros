-- Sexo do guia (M = masculino, F = feminino)
ALTER TABLE gcv_guides
  ADD COLUMN sexo ENUM('M','F') NULL AFTER birth_date;
