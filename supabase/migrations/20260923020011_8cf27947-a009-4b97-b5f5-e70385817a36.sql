
CREATE POLICY "photos_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'photos');
CREATE POLICY "photos_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "photos_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "photos_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
