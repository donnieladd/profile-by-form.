
-- Storage policies for source-files bucket (team members only)
CREATE POLICY "source_files_select_team"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'source-files' AND public.is_team_member(auth.uid()));

CREATE POLICY "source_files_insert_team"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'source-files' AND public.is_team_member(auth.uid()));

CREATE POLICY "source_files_update_team"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'source-files' AND public.is_team_member(auth.uid()))
WITH CHECK (bucket_id = 'source-files' AND public.is_team_member(auth.uid()));

CREATE POLICY "source_files_delete_team"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'source-files' AND public.is_team_member(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_candidates_search ON public.search_candidates(search_id);
CREATE INDEX IF NOT EXISTS idx_search_candidates_candidate ON public.search_candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_source_items_candidate ON public.source_items(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_searches_stage_status ON public.searches(stage, status);
