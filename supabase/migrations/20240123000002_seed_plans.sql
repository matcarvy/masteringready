-- MasteringReady - Seed Data: Subscription Plans
-- Version: 1.0.0

-- ============================================================================
-- INSERT SUBSCRIPTION PLANS
-- ============================================================================

INSERT INTO plans (
    name,
    type,
    price_monthly,
    price_yearly,
    analyses_per_month,
    reference_comparisons_per_day,
    batch_processing,
    api_access,
    priority_processing,
    social_media_optimizer,
    white_label_reports,
    description_es,
    description_en,
    features_es,
    features_en,
    display_order
) VALUES
-- FREE PLAN
(
    'Free',
    'free',
    0.00,
    NULL,
    3,  -- 3 analyses per month
    0,  -- No reference comparisons
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    'Perfecto para probar MasteringReady',
    'Perfect for trying MasteringReady',
    '["3 análisis gratuitos al mes", "Análisis completo de mezcla", "Reporte descargable", "Soporte por email"]'::jsonb,
    '["3 free analyses per month", "Complete mix analysis", "Downloadable report", "Email support"]'::jsonb,
    1
),
-- PRO PLAN
(
    'Pro',
    'pro',
    9.99,
    99.99,  -- ~17% discount yearly
    -1,  -- Unlimited analyses
    5,   -- 5 reference comparisons per day
    FALSE,
    FALSE,
    TRUE,  -- Priority processing
    TRUE,  -- Social media optimizer
    FALSE,
    'Para productores y artistas serios',
    'For serious producers and artists',
    '["Análisis ilimitados", "Social Media Audio Optimizer", "Comparación con referencias (5/día)", "Procesamiento prioritario", "Histórico de análisis", "Soporte prioritario"]'::jsonb,
    '["Unlimited analyses", "Social Media Audio Optimizer", "Reference comparison (5/day)", "Priority processing", "Analysis history", "Priority support"]'::jsonb,
    2
),
-- STUDIO PLAN
(
    'Studio',
    'studio',
    29.99,
    299.99,  -- ~17% discount yearly
    -1,  -- Unlimited analyses
    -1,  -- Unlimited reference comparisons
    TRUE,  -- Batch processing
    TRUE,  -- API access
    TRUE,  -- Priority processing
    TRUE,  -- Social media optimizer
    TRUE,  -- White label reports
    'Para estudios profesionales y labels',
    'For professional studios and labels',
    '["Todo lo de Pro", "Comparación ilimitada con referencias", "Procesamiento por lotes", "Acceso API", "Reportes white-label", "Soporte dedicado"]'::jsonb,
    '["Everything in Pro", "Unlimited reference comparison", "Batch processing", "API access", "White-label reports", "Dedicated support"]'::jsonb,
    3
);

-- ============================================================================
-- VERIFY INSERTION
-- ============================================================================
-- Run this to verify plans were created:
-- SELECT name, type, price_monthly, analyses_per_month FROM plans ORDER BY display_order;
