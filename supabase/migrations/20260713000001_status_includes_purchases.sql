-- ============================================================================
-- DISPLAY STATUS MUST SEE PURCHASES
-- ============================================================================
-- get_user_analysis_status feeds the dashboard and the subscription page. It
-- was written before Single purchases existed and only joins subscriptions,
-- so a user who paid for a Single analysis saw "Gratis" and an exhausted
-- counter with no sign of the credit they had just bought.
--
-- can_user_analyze (the real gate) already reads purchases and is untouched
-- here: consume_analysis_credit branches on its exact USING_PURCHASE reason.
-- This migration changes the display function only.
--
-- The return signature gains a column, so the function must be dropped first;
-- CREATE OR REPLACE cannot change a RETURNS TABLE shape.

DROP FUNCTION IF EXISTS public.get_user_analysis_status(UUID);

CREATE FUNCTION public.get_user_analysis_status(p_user_id UUID)
RETURNS TABLE (
    plan_type plan_type,
    plan_name TEXT,
    is_lifetime BOOLEAN,
    analyses_used INTEGER,
    analyses_limit INTEGER,
    addon_remaining INTEGER,
    addon_packs_available INTEGER,
    can_analyze BOOLEAN,
    subscription_status subscription_status,
    current_period_end TIMESTAMPTZ,
    purchased_remaining INTEGER
) AS $$
DECLARE
    v_purchased INTEGER;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'not authorized for this user';
    END IF;

    SELECT COALESCE(SUM(pu.analyses_granted - pu.analyses_used), 0)
    INTO v_purchased
    FROM public.purchases pu
    WHERE pu.user_id = p_user_id
      AND pu.status = 'succeeded'
      AND pu.analyses_granted > pu.analyses_used;

    RETURN QUERY
    SELECT
        p.type,
        p.name::TEXT,
        p.is_lifetime_limit,
        (CASE
            WHEN p.is_lifetime_limit THEN COALESCE(pr.analyses_lifetime_used, 0)
            ELSE COALESCE(s.analyses_used_this_cycle, 0)
        END)::INTEGER,
        (CASE
            WHEN p.is_lifetime_limit THEN COALESCE(p.analyses_total, 2)
            ELSE COALESCE(p.analyses_per_month, 30)
        END)::INTEGER,
        COALESCE(s.addon_analyses_remaining, 0)::INTEGER,
        (CASE
            WHEN p.type = 'pro' THEN 2 - COALESCE(s.addon_packs_this_cycle, 0)
            ELSE 0
        END)::INTEGER,
        CASE
            WHEN p.is_lifetime_limit THEN COALESCE(pr.analyses_lifetime_used, 0) < COALESCE(p.analyses_total, 2) OR v_purchased > 0
            WHEN p.type = 'pro' THEN COALESCE(s.analyses_used_this_cycle, 0) < 30 OR COALESCE(s.addon_analyses_remaining, 0) > 0 OR v_purchased > 0
            WHEN p.type = 'studio' THEN TRUE
            ELSE v_purchased > 0
        END,
        s.status,
        s.current_period_end,
        v_purchased::INTEGER
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    JOIN profiles pr ON s.user_id = pr.id
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
