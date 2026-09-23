
DROP POLICY "messages_select_member" ON public.messages;
DROP POLICY "messages_insert_member" ON public.messages;
DROP POLICY "messages_update_member" ON public.messages;
DROP FUNCTION public.is_match_member(uuid, uuid);

CREATE POLICY "messages_select_member" ON public.messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = messages.match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid())));
CREATE POLICY "messages_insert_member" ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = messages.match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid())));
CREATE POLICY "messages_update_member" ON public.messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = messages.match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid())));

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_swipe_match() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
