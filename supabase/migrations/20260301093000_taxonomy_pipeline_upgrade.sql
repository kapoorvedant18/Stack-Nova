ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Personal',
  ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'Manual';

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Personal',
  ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'Notes';

ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Personal',
  ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'Manual';

CREATE TABLE IF NOT EXISTS public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_summary TEXT DEFAULT '',
  attachments TEXT NOT NULL DEFAULT '',
  is_important BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'Work',
  tags TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'Email',
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL DEFAULT 'Meetings',
  tags TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'Calendar',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT DEFAULT '',
  web_url TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Projects',
  tags TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'Files',
  modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Personal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can create their own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can update their own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can delete their own emails" ON public.emails;

CREATE POLICY "Users can view their own emails" ON public.emails FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create their own emails" ON public.emails FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own emails" ON public.emails FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own emails" ON public.emails FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can create their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON public.calendar_events;

CREATE POLICY "Users can view their own calendar events" ON public.calendar_events FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create their own calendar events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own calendar events" ON public.calendar_events FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own calendar events" ON public.calendar_events FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can create their own files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;

CREATE POLICY "Users can view their own files" ON public.files FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create their own files" ON public.files FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own files" ON public.files FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own files" ON public.files FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view their own custom tags" ON public.custom_tags;
DROP POLICY IF EXISTS "Users can create their own custom tags" ON public.custom_tags;
DROP POLICY IF EXISTS "Users can delete their own custom tags" ON public.custom_tags;

CREATE POLICY "Users can view their own custom tags" ON public.custom_tags FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create their own custom tags" ON public.custom_tags FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own custom tags" ON public.custom_tags FOR DELETE USING (auth.uid()::text = user_id);

DROP TRIGGER IF EXISTS update_emails_updated_at ON public.emails;
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
DROP TRIGGER IF EXISTS update_files_updated_at ON public.files;
DROP TRIGGER IF EXISTS update_custom_tags_updated_at ON public.custom_tags;

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_custom_tags_updated_at BEFORE UPDATE ON public.custom_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
