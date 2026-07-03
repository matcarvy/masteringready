-- ============================================================================
-- SERVER-AUTHORITATIVE CREDIT CONSUME (audit #3)
-- ============================================================================
-- The analysis backend (Render) calls consume_analysis_credit via service_role
-- when an analysis completes successfully, keyed to the analyze-token nonce.
-- The nonce ledger makes the call idempotent: one token can never burn two
-- credits, and a retry after a network failure is safe. A failed analysis
-- never reaches the consume call, so it never burns a credit.
--
-- The client-side counter RPCs remain callable (auth.uid()-bound) as the
-- fallback path for responses that predate server consume.

CREATE TABLE IF NOT EXISTS public.analysis_credit_ledger (
    nonce TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    source TEXT NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No policies: RLS with none defined denies everything except service_role.
ALTER TABLE public.analysis_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_analysis_credit(p_user_id UUID, p_nonce TEXT)
RETURNS TABLE (success BOOLEAN, source TEXT, already_consumed BOOLEAN) AS $$
DECLARE
    v_status RECORD;
    v_inc RECORD;
    v_source TEXT;
    v_ok BOOLEAN;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    IF p_nonce IS NULL OR length(p_nonce) < 16 THEN
        RAISE EXCEPTION 'invalid nonce';
    END IF;

    -- Claim the nonce first. A concurrent duplicate blocks on the PK until
    -- this transaction commits, then lands in the already-consumed branch.
    INSERT INTO public.analysis_credit_ledger (nonce, user_id, source)
    VALUES (p_nonce, p_user_id, 'pending')
    ON CONFLICT (nonce) DO NOTHING;

    IF NOT FOUND THEN
        SELECT l.source INTO v_source
        FROM public.analysis_credit_ledger l
        WHERE l.nonce = p_nonce;
        RETURN QUERY SELECT TRUE, v_source, TRUE;
        RETURN;
    END IF;

    SELECT * INTO v_status FROM public.can_user_analyze(p_user_id);

    IF v_status.can_analyze IS NOT TRUE THEN
        DELETE FROM public.analysis_credit_ledger WHERE nonce = p_nonce;
        RETURN QUERY SELECT FALSE, COALESCE(v_status.reason, 'NO_QUOTA'), FALSE;
        RETURN;
    END IF;

    -- Same source decision the client makes today: USING_PURCHASE burns the
    -- oldest open purchase (FIFO), everything else hits the plan counters.
    IF v_status.reason = 'USING_PURCHASE' THEN
        v_ok := public.consume_purchase_credit(p_user_id);
        v_source := 'purchase';
    ELSE
        SELECT * INTO v_inc FROM public.increment_analysis_count(p_user_id);
        v_ok := COALESCE(v_inc.success, FALSE);
        v_source := v_inc.source;
    END IF;

    IF v_ok IS NOT TRUE THEN
        DELETE FROM public.analysis_credit_ledger WHERE nonce = p_nonce;
        RETURN QUERY SELECT FALSE, v_source, FALSE;
        RETURN;
    END IF;

    UPDATE public.analysis_credit_ledger SET source = v_source WHERE nonce = p_nonce;
    RETURN QUERY SELECT TRUE, v_source, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.consume_analysis_credit(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_analysis_credit(UUID, TEXT) FROM authenticated;
