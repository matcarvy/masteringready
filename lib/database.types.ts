/**
 * MasteringReady - Supabase Database Types
 * Auto-generated types for TypeScript integration
 *
 * To regenerate after schema changes:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types
export type PlanType = 'free' | 'pro' | 'studio' | 'single' | 'addon'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'
export type AnalysisVerdict = 'ready' | 'almost_ready' | 'needs_work' | 'critical'

// Feedback enums
export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'praise' | 'question' | 'other'
export type FeedbackStatus = 'new' | 'read' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate'
export type FeedbackSource = 'web_app' | 'api' | 'email' | 'social'
export type SatisfactionRating = '1' | '2' | '3' | '4' | '5'

// Language type (bilingual support / soporte bilingüe)
export type Language = 'es' | 'en'

export interface Database {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string
          name: string
          type: PlanType
          price_monthly: number
          price_yearly: number | null
          price_usd_benchmark: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          analyses_per_month: number
          analyses_total: number | null
          is_lifetime_limit: boolean
          is_addon: boolean
          requires_subscription_type: PlanType | null
          max_per_cycle: number | null
          reference_comparisons_per_day: number
          batch_processing: boolean
          api_access: boolean
          priority_processing: boolean
          social_media_optimizer: boolean
          white_label_reports: boolean
          description_es: string | null
          description_en: string | null
          features_es: Json | null
          features_en: Json | null
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: PlanType
          price_monthly?: number
          price_yearly?: number | null
          price_usd_benchmark?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          analyses_per_month?: number
          analyses_total?: number | null
          is_lifetime_limit?: boolean
          is_addon?: boolean
          requires_subscription_type?: PlanType | null
          max_per_cycle?: number | null
          reference_comparisons_per_day?: number
          batch_processing?: boolean
          api_access?: boolean
          priority_processing?: boolean
          social_media_optimizer?: boolean
          white_label_reports?: boolean
          description_es?: string | null
          description_en?: string | null
          features_es?: Json | null
          features_en?: Json | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: PlanType
          price_monthly?: number
          price_yearly?: number | null
          price_usd_benchmark?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          analyses_per_month?: number
          analyses_total?: number | null
          is_lifetime_limit?: boolean
          is_addon?: boolean
          requires_subscription_type?: PlanType | null
          max_per_cycle?: number | null
          reference_comparisons_per_day?: number
          batch_processing?: boolean
          api_access?: boolean
          priority_processing?: boolean
          social_media_optimizer?: boolean
          white_label_reports?: boolean
          description_es?: string | null
          description_en?: string | null
          features_es?: Json | null
          features_en?: Json | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          preferred_language: string
          total_analyses: number
          analyses_this_month: number
          analyses_lifetime_used: number
          last_analysis_at: string | null
          default_strict_mode: boolean
          default_report_mode: string
          email_notifications: boolean
          country_code: string | null
          detected_country_code: string | null
          country_detected_at: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          preferred_language?: string
          total_analyses?: number
          analyses_this_month?: number
          analyses_lifetime_used?: number
          last_analysis_at?: string | null
          default_strict_mode?: boolean
          default_report_mode?: string
          email_notifications?: boolean
          country_code?: string | null
          detected_country_code?: string | null
          country_detected_at?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          preferred_language?: string
          total_analyses?: number
          analyses_this_month?: number
          analyses_lifetime_used?: number
          last_analysis_at?: string | null
          default_strict_mode?: boolean
          default_report_mode?: string
          email_notifications?: boolean
          country_code?: string | null
          detected_country_code?: string | null
          country_detected_at?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: SubscriptionStatus
          is_yearly: boolean
          current_period_start: string
          current_period_end: string
          trial_end: string | null
          canceled_at: string | null
          analyses_used_this_cycle: number
          addon_analyses_remaining: number
          addon_packs_this_cycle: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          is_yearly?: boolean
          current_period_start?: string
          current_period_end: string
          trial_end?: string | null
          canceled_at?: string | null
          analyses_used_this_cycle?: number
          addon_analyses_remaining?: number
          addon_packs_this_cycle?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          is_yearly?: boolean
          current_period_start?: string
          current_period_end?: string
          trial_end?: string | null
          canceled_at?: string | null
          analyses_used_this_cycle?: number
          addon_analyses_remaining?: number
          addon_packs_this_cycle?: number
          created_at?: string
          updated_at?: string
        }
      }
      analyses: {
        Row: {
          id: string
          user_id: string | null
          filename: string
          file_size_bytes: number | null
          file_format: string | null
          duration_seconds: number | null
          sample_rate: number | null
          bit_depth: number | null
          channels: number | null
          lang: string
          strict_mode: boolean
          report_mode: string
          score: number
          verdict: AnalysisVerdict
          metrics: Json | null
          interpretations: Json | null
          report_short: string | null
          report_write: string | null
          report_visual: string | null
          processing_time_seconds: number | null
          used_chunked_analysis: boolean | null
          created_at: string
          scheduled_deletion_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          filename: string
          file_size_bytes?: number | null
          file_format?: string | null
          duration_seconds?: number | null
          sample_rate?: number | null
          bit_depth?: number | null
          channels?: number | null
          lang?: string
          strict_mode?: boolean
          report_mode?: string
          score: number
          verdict: AnalysisVerdict
          metrics?: Json | null
          interpretations?: Json | null
          report_short?: string | null
          report_write?: string | null
          report_visual?: string | null
          processing_time_seconds?: number | null
          used_chunked_analysis?: boolean | null
          created_at?: string
          scheduled_deletion_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          filename?: string
          file_size_bytes?: number | null
          file_format?: string | null
          duration_seconds?: number | null
          sample_rate?: number | null
          bit_depth?: number | null
          channels?: number | null
          lang?: string
          strict_mode?: boolean
          report_mode?: string
          score?: number
          verdict?: AnalysisVerdict
          metrics?: Json | null
          interpretations?: Json | null
          report_short?: string | null
          report_write?: string | null
          report_visual?: string | null
          processing_time_seconds?: number | null
          used_chunked_analysis?: boolean | null
          created_at?: string
          scheduled_deletion_at?: string | null
          deleted_at?: string | null
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          date: string
          analyses_count: number
          reference_comparisons_count: number
          pdf_downloads_count: number
          last_reset_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          analyses_count?: number
          reference_comparisons_count?: number
          pdf_downloads_count?: number
          last_reset_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          analyses_count?: number
          reference_comparisons_count?: number
          pdf_downloads_count?: number
          last_reset_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          stripe_charge_id: string | null
          amount: number
          currency: string
          status: PaymentStatus
          description: string | null
          receipt_url: string | null
          failure_code: string | null
          failure_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          stripe_charge_id?: string | null
          amount: number
          currency?: string
          status?: PaymentStatus
          description?: string | null
          receipt_url?: string | null
          failure_code?: string | null
          failure_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          stripe_charge_id?: string | null
          amount?: number
          currency?: string
          status?: PaymentStatus
          description?: string | null
          receipt_url?: string | null
          failure_code?: string | null
          failure_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key_hash: string
          key_prefix: string
          name: string
          last_used_at: string | null
          total_requests: number
          is_active: boolean
          expires_at: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key_hash: string
          key_prefix: string
          name?: string
          last_used_at?: string | null
          total_requests?: number
          is_active?: boolean
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          key_hash?: string
          key_prefix?: string
          name?: string
          last_used_at?: string | null
          total_requests?: number
          is_active?: boolean
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
      }
      // Purchases - One-off purchases (single analysis, addon packs)
      purchases: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          amount: number
          currency: string
          country_code: string | null
          analyses_granted: number
          analyses_used: number
          status: PaymentStatus
          subscription_id: string | null
          created_at: string
          expires_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount: number
          currency?: string
          country_code?: string | null
          analyses_granted?: number
          analyses_used?: number
          status?: PaymentStatus
          subscription_id?: string | null
          created_at?: string
          expires_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount?: number
          currency?: string
          country_code?: string | null
          analyses_granted?: number
          analyses_used?: number
          status?: PaymentStatus
          subscription_id?: string | null
          created_at?: string
          expires_at?: string | null
          updated_at?: string
        }
      }
      // Regional Pricing - PPP-adjusted pricing by country
      regional_pricing: {
        Row: {
          id: string
          country_code: string
          currency: string
          multiplier: number
          tier: number
          payment_provider: string
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          country_code: string
          currency: string
          multiplier?: number
          tier?: number
          payment_provider?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          country_code?: string
          currency?: string
          multiplier?: number
          tier?: number
          payment_provider?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // User Feedback / Retroalimentación de Usuarios
      user_feedback: {
        Row: {
          id: string
          user_id: string | null
          category: FeedbackCategory
          subject: string
          message: string
          lang: Language
          satisfaction: SatisfactionRating | null
          source: FeedbackSource
          page_url: string | null
          user_agent: string | null
          browser_info: Json | null
          analysis_id: string | null
          contact_email: string | null
          wants_response: boolean
          status: FeedbackStatus
          admin_notes: string | null
          response_es: string | null  // Respuesta en español
          response_en: string | null  // Response in English
          responded_at: string | null
          responded_by: string | null
          is_priority: boolean
          priority_reason: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          category?: FeedbackCategory
          subject: string
          message: string
          lang?: Language
          satisfaction?: SatisfactionRating | null
          source?: FeedbackSource
          page_url?: string | null
          user_agent?: string | null
          browser_info?: Json | null
          analysis_id?: string | null
          contact_email?: string | null
          wants_response?: boolean
          status?: FeedbackStatus
          admin_notes?: string | null
          response_es?: string | null
          response_en?: string | null
          responded_at?: string | null
          responded_by?: string | null
          is_priority?: boolean
          priority_reason?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          category?: FeedbackCategory
          subject?: string
          message?: string
          lang?: Language
          satisfaction?: SatisfactionRating | null
          source?: FeedbackSource
          page_url?: string | null
          user_agent?: string | null
          browser_info?: Json | null
          analysis_id?: string | null
          contact_email?: string | null
          wants_response?: boolean
          status?: FeedbackStatus
          admin_notes?: string | null
          response_es?: string | null
          response_en?: string | null
          responded_at?: string | null
          responded_by?: string | null
          is_priority?: boolean
          priority_reason?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      // Feedback Votes / Votos de Retroalimentación
      feedback_votes: {
        Row: {
          id: string
          feedback_id: string
          user_id: string
          vote_type: 'upvote' | 'downvote'
          created_at: string
        }
        Insert: {
          id?: string
          feedback_id: string
          user_id: string
          vote_type?: 'upvote' | 'downvote'
          created_at?: string
        }
        Update: {
          id?: string
          feedback_id?: string
          user_id?: string
          vote_type?: 'upvote' | 'downvote'
          created_at?: string
        }
      }
    }
    Views: {
      // Public feature requests with vote counts
      // Solicitudes de funciones públicas con conteo de votos
      public_feature_requests: {
        Row: {
          id: string
          subject: string
          message: string
          lang: Language
          status: FeedbackStatus
          created_at: string
          vote_count: number
          total_votes: number
        }
      }
    }
    Functions: {
      can_user_analyze: {
        Args: { p_user_id: string }
        Returns: {
          can_analyze: boolean
          reason: string
          analyses_used: number
          analyses_limit: number
          is_lifetime: boolean
        }[]
      }
      increment_analysis_count: {
        Args: { p_user_id: string }
        Returns: {
          success: boolean
          source: string
        }[]
      }
      reset_monthly_counters: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_buy_addon: {
        Args: { p_user_id: string }
        Returns: {
          can_buy: boolean
          reason: string
          packs_this_cycle: number
          max_packs: number
        }[]
      }
      get_user_analysis_status: {
        Args: { p_user_id: string }
        Returns: {
          plan_type: PlanType
          plan_name: string
          is_lifetime: boolean
          analyses_used: number
          analyses_limit: number
          addon_remaining: number
          addon_packs_available: number
          can_analyze: boolean
          subscription_status: SubscriptionStatus
          current_period_end: string
        }[]
      }
      use_single_purchase: {
        Args: { p_user_id: string; p_purchase_id: string }
        Returns: boolean
      }
      add_addon_pack: {
        Args: { p_user_id: string; p_purchase_id: string }
        Returns: boolean
      }
      reset_subscription_cycle: {
        Args: { p_user_id: string; p_new_period_start: string; p_new_period_end: string }
        Returns: undefined
      }
    }
    Enums: {
      plan_type: PlanType
      subscription_status: SubscriptionStatus
      payment_status: PaymentStatus
      analysis_verdict: AnalysisVerdict
      feedback_category: FeedbackCategory
      feedback_status: FeedbackStatus
      feedback_source: FeedbackSource
      satisfaction_rating: SatisfactionRating
    }
  }
}

// Convenience types for common use cases
export type Plan = Database['public']['Tables']['plans']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Analysis = Database['public']['Tables']['analyses']['Row']
export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type Purchase = Database['public']['Tables']['purchases']['Row']
export type RegionalPricing = Database['public']['Tables']['regional_pricing']['Row']

// Insert types
export type PlanInsert = Database['public']['Tables']['plans']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
export type AnalysisInsert = Database['public']['Tables']['analyses']['Insert']
export type UsageTrackingInsert = Database['public']['Tables']['usage_tracking']['Insert']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert']
export type PurchaseInsert = Database['public']['Tables']['purchases']['Insert']
export type RegionalPricingInsert = Database['public']['Tables']['regional_pricing']['Insert']

// Update types
export type PlanUpdate = Database['public']['Tables']['plans']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']
export type AnalysisUpdate = Database['public']['Tables']['analyses']['Update']
export type UsageTrackingUpdate = Database['public']['Tables']['usage_tracking']['Update']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']
export type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update']
export type PurchaseUpdate = Database['public']['Tables']['purchases']['Update']
export type RegionalPricingUpdate = Database['public']['Tables']['regional_pricing']['Update']

// User analysis status (from get_user_analysis_status function)
export type UserAnalysisStatus = {
  plan_type: PlanType
  plan_name: string
  is_lifetime: boolean
  analyses_used: number
  analyses_limit: number
  addon_remaining: number
  addon_packs_available: number
  can_analyze: boolean
  subscription_status: SubscriptionStatus
  current_period_end: string
}
export type UserFeedbackUpdate = Database['public']['Tables']['user_feedback']['Update']
export type FeedbackVoteUpdate = Database['public']['Tables']['feedback_votes']['Update']

// Feedback types / Tipos de retroalimentación
export type UserFeedback = Database['public']['Tables']['user_feedback']['Row']
export type UserFeedbackInsert = Database['public']['Tables']['user_feedback']['Insert']
export type FeedbackVote = Database['public']['Tables']['feedback_votes']['Row']
export type FeedbackVoteInsert = Database['public']['Tables']['feedback_votes']['Insert']
export type PublicFeatureRequest = Database['public']['Views']['public_feature_requests']['Row']

// ============================================================================
// BILINGUAL HELPERS / AYUDANTES BILINGÜES
// ============================================================================

/**
 * Get localized field from a plan
 * Obtener campo localizado de un plan
 */
export function getLocalizedPlanField<T extends 'description' | 'features'>(
  plan: Plan,
  field: T,
  lang: Language
): T extends 'description' ? string | null : Json | null {
  const key = `${field}_${lang}` as keyof Plan
  return plan[key] as any
}

/**
 * Get localized feedback response
 * Obtener respuesta de retroalimentación localizada
 */
export function getLocalizedFeedbackResponse(
  feedback: UserFeedback,
  lang: Language
): string | null {
  return lang === 'es' ? feedback.response_es : feedback.response_en
}

// ============================================================================
// CATEGORY & STATUS LABELS / ETIQUETAS DE CATEGORÍA Y ESTADO
// ============================================================================

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, { es: string; en: string }> = {
  bug: { es: 'Error/Bug', en: 'Bug/Error' },
  feature: { es: 'Solicitud de función', en: 'Feature request' },
  improvement: { es: 'Mejora sugerida', en: 'Suggested improvement' },
  praise: { es: 'Comentario positivo', en: 'Positive feedback' },
  question: { es: 'Pregunta', en: 'Question' },
  other: { es: 'Otro', en: 'Other' }
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, { es: string; en: string }> = {
  new: { es: 'Nuevo', en: 'New' },
  read: { es: 'Leído', en: 'Read' },
  in_progress: { es: 'En progreso', en: 'In progress' },
  resolved: { es: 'Resuelto', en: 'Resolved' },
  wont_fix: { es: 'No se hará', en: "Won't fix" },
  duplicate: { es: 'Duplicado', en: 'Duplicate' }
}

export const VERDICT_LABELS: Record<AnalysisVerdict, { es: string; en: string }> = {
  ready: { es: 'Listo para mastering', en: 'Ready for mastering' },
  almost_ready: { es: 'Casi listo', en: 'Almost ready' },
  needs_work: { es: 'Necesita trabajo', en: 'Needs work' },
  critical: { es: 'Problemas críticos', en: 'Critical issues' }
}
