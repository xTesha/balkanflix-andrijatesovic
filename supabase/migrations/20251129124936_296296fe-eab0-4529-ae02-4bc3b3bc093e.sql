-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create watch_later table
CREATE TABLE public.watch_later (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  media_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, media_type, media_id)
);

ALTER TABLE public.watch_later ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watch later list"
  ON public.watch_later FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their watch later list"
  ON public.watch_later FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their watch later list"
  ON public.watch_later FOR DELETE
  USING (auth.uid() = user_id);

-- Create continue_watching table
CREATE TABLE public.continue_watching (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  media_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  progress_seconds INTEGER DEFAULT 0 NOT NULL,
  total_seconds INTEGER DEFAULT 0 NOT NULL,
  season INTEGER,
  episode INTEGER,
  last_watched TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, media_type, media_id, season, episode)
);

ALTER TABLE public.continue_watching ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own continue watching list"
  ON public.continue_watching FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their continue watching list"
  ON public.continue_watching FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their continue watching progress"
  ON public.continue_watching FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove from their continue watching list"
  ON public.continue_watching FOR DELETE
  USING (auth.uid() = user_id);

-- Create watch_history table for tracking watch time
CREATE TABLE public.watch_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  media_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  watch_time_seconds INTEGER DEFAULT 0 NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watch history"
  ON public.watch_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their watch history"
  ON public.watch_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();