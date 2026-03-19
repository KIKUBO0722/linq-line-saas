// Tenant types
export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';
export type AdminRole = 'owner' | 'admin' | 'viewer';

// Plan types
export type PlanName = 'free' | 'start' | 'standard' | 'pro';

export interface PlanLimits {
  friendLimit: number;
  messageLimit: number;
  aiResponseLimit: number;
  aiGenerateLimit: number;
  stepScenarioLimit: number;
  richMenuLimit: number;
  formLimit: number;
  tagLimit: number;
  teamMemberLimit: number;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {
    friendLimit: 100,
    messageLimit: 1000,
    aiResponseLimit: 50,
    aiGenerateLimit: 10,
    stepScenarioLimit: 1,
    richMenuLimit: 1,
    formLimit: 1,
    tagLimit: 10,
    teamMemberLimit: 1,
  },
  start: {
    friendLimit: 500,
    messageLimit: 5000,
    aiResponseLimit: 500,
    aiGenerateLimit: 100,
    stepScenarioLimit: 5,
    richMenuLimit: 3,
    formLimit: 3,
    tagLimit: 100,
    teamMemberLimit: 3,
  },
  standard: {
    friendLimit: 5000,
    messageLimit: 30000,
    aiResponseLimit: 5000,
    aiGenerateLimit: 500,
    stepScenarioLimit: Infinity,
    richMenuLimit: Infinity,
    formLimit: Infinity,
    tagLimit: Infinity,
    teamMemberLimit: 10,
  },
  pro: {
    friendLimit: 50000,
    messageLimit: 100000,
    aiResponseLimit: Infinity,
    aiGenerateLimit: Infinity,
    stepScenarioLimit: Infinity,
    richMenuLimit: Infinity,
    formLimit: Infinity,
    tagLimit: Infinity,
    teamMemberLimit: Infinity,
  },
};

// Message types
export type MessageDirection = 'inbound' | 'outbound';
export type MessageSendType = 'reply' | 'push' | 'multicast' | 'broadcast';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed';

// Step scenario types
export type StepTriggerType = 'follow' | 'tag_added' | 'form_submitted' | 'manual';
export type StepEnrollmentStatus = 'active' | 'completed' | 'paused' | 'cancelled';

// Subscription types
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';

// Referral types
export type ReferralRewardType = 'coupon' | 'point' | 'message';
