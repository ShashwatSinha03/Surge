export type TemplateType =
  | 'saas'
  | 'hackathon'
  | 'portfolio'
  | 'mobile_app'
  | 'open_source'
  | 'custom';

export type QuestState =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'
  | 'deleted';

export type MemberRole = 'owner' | 'admin' | 'member';

export type MilestoneStatus = 'open' | 'completed';

export type ActionStatus = 'open' | 'claimed' | 'blocked' | 'completed';

export type User = {
  id: string;
  clerk_user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

export type Quest = {
  id: string;
  title: string;
  description: string | null;
  template_type: TemplateType;
  owner_id: string;
  status: QuestState;
  health_score: number | null;
  created_at: string;
  updated_at: string;
};

export type QuestMember = {
  id: string;
  quest_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
};

export type QuestWithRole = Quest & { role: MemberRole };

export type CreateQuestInput = {
  title: string;
  description?: string;
  template_type: TemplateType;
};

export type Invite = {
  id: string;
  quest_id: string;
  email: string | null;
  token_hash: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type MemberWithUser = {
  id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

export type Milestone = {
  id: string;
  quest_id: string;
  title: string;
  status: MilestoneStatus;
  position: number;
  created_by: string;
  created_at: string;
};

export type Action = {
  id: string;
  quest_id: string;
  milestone_id: string;
  title: string;
  description: string | null;
  status: ActionStatus;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ActionWithOwner = Action & {
  owner_name: string | null;
  owner_avatar: string | null;
};

export type MilestoneWithActions = Milestone & {
  actions: ActionWithOwner[];
};
