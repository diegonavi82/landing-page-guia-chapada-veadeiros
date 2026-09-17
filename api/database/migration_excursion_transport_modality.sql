ALTER TABLE gcv_excursions
  ADD COLUMN offer_transport TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE gcv_excursions
  ADD COLUMN guide_net_transport_cents INT UNSIGNED NULL;

ALTER TABLE gcv_excursions
  ADD COLUMN price_transport_cents INT UNSIGNED NULL;

ALTER TABLE gcv_excursions
  ADD COLUMN commission_transport_cents INT UNSIGNED NULL;

ALTER TABLE gcv_excursions
  ADD COLUMN quorum_transport TINYINT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE gcv_excursions
  ADD COLUMN max_people_transport TINYINT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE gcv_excursions
  ADD COLUMN booked_people_transport TINYINT UNSIGNED NOT NULL DEFAULT 0;
