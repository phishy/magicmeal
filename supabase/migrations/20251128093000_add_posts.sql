-- Creates social posts tables, policies, and storage bucket for media uploads.

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text,
  media_count smallint NOT NULL DEFAULT 0 CHECK (media_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_profile_created_idx
  ON public.posts (profile_id, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts"
  ON public.posts FOR SELECT USING (true);

CREATE POLICY "Users create their posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users manage their posts"
  ON public.posts FOR UPDATE USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users delete their posts"
  ON public.posts FOR DELETE USING (auth.uid() = profile_id);

CREATE TABLE public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime_type text,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX post_media_post_sort_idx
  ON public.post_media (post_id, sort_order);

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read post media"
  ON public.post_media FOR SELECT USING (true);

CREATE POLICY "Owners add media to their posts"
  ON public.post_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_media.post_id AND p.profile_id = auth.uid()
    )
  );

CREATE POLICY "Owners manage their media"
  ON public.post_media FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_media.post_id AND p.profile_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_media.post_id AND p.profile_id = auth.uid()
    )
  );

CREATE POLICY "Owners delete their media"
  ON public.post_media FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_media.post_id AND p.profile_id = auth.uid()
    )
  );

-- Ensure the storage bucket for post media exists (safe to re-run).
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies for the post-media bucket.
CREATE POLICY "Public read post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Owners upload post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Owners manage their post media"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'post-media' AND auth.uid() = owner
  ) WITH CHECK (
    bucket_id = 'post-media' AND auth.uid() = owner
  );

CREATE POLICY "Owners delete their post media"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'post-media' AND auth.uid() = owner
  );

