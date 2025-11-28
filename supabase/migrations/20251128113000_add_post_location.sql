-- Adds optional location metadata to posts for future mapping features.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS location_latitude numeric(9, 6),
  ADD COLUMN IF NOT EXISTS location_longitude numeric(9, 6);

ALTER TABLE public.posts
  ADD CONSTRAINT posts_latitude_check
    CHECK (location_latitude IS NULL OR (location_latitude >= -90 AND location_latitude <= 90));

ALTER TABLE public.posts
  ADD CONSTRAINT posts_longitude_check
    CHECK (location_longitude IS NULL OR (location_longitude >= -180 AND location_longitude <= 180));


