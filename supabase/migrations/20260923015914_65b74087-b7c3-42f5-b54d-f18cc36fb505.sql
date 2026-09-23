
-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  birth_date date,
  gender text CHECK (gender IN ('male','female','other')),
  seeking text NOT NULL DEFAULT 'all' CHECK (seeking IN ('male','female','all')),
  city text,
  bio text NOT NULL DEFAULT '',
  occupation text,
  height_cm int,
  interests text[] NOT NULL DEFAULT '{}',
  photos text[] NOT NULL DEFAULT '{}',
  avatar_url text,
  is_verified boolean NOT NULL DEFAULT false,
  onboarded boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- SWIPES
CREATE TABLE public.swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id uuid NOT NULL,
  target_id uuid NOT NULL,
  liked boolean NOT NULL,
  is_super boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (swiper_id, target_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swipes TO authenticated;
GRANT ALL ON public.swipes TO service_role;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swipes_select_own" ON public.swipes FOR SELECT TO authenticated USING (auth.uid() = swiper_id OR auth.uid() = target_id);
CREATE POLICY "swipes_insert_own" ON public.swipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = swiper_id AND swiper_id <> target_id);
CREATE POLICY "swipes_delete_own" ON public.swipes FOR DELETE TO authenticated USING (auth.uid() = swiper_id);

-- MATCHES
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select_member" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "matches_delete_member" ON public.matches FOR DELETE TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_match_idx ON public.messages (match_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_match_member(_match_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.matches m WHERE m.id = _match_id AND (m.user_a = _user_id OR m.user_b = _user_id));
$$;

CREATE POLICY "messages_select_member" ON public.messages FOR SELECT TO authenticated USING (public.is_match_member(match_id, auth.uid()));
CREATE POLICY "messages_insert_member" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_match_member(match_id, auth.uid()));
CREATE POLICY "messages_update_member" ON public.messages FOR UPDATE TO authenticated USING (public.is_match_member(match_id, auth.uid()));

-- BLOCKS
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_own" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "blocks_insert_own" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocks_delete_own" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_own" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- auto-create match on mutual like
CREATE OR REPLACE FUNCTION public.handle_swipe_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a uuid; b uuid;
BEGIN
  IF NEW.liked THEN
    IF EXISTS (SELECT 1 FROM public.swipes s WHERE s.swiper_id = NEW.target_id AND s.target_id = NEW.swiper_id AND s.liked) THEN
      a := LEAST(NEW.swiper_id, NEW.target_id);
      b := GREATEST(NEW.swiper_id, NEW.target_id);
      INSERT INTO public.matches (user_a, user_b) VALUES (a, b) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_swipe_created AFTER INSERT ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.handle_swipe_match();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
