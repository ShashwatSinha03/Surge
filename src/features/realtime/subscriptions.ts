import { createBrowserClient } from '@/lib/supabase/client';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const clientInstances = new WeakMap<RealtimeChannel, SupabaseClient>();

export type SubscriptionConfig = {
  questId: string;
  onEvent: (payload: any) => void;
  onStatusChange?: (status: string) => void;
  accessToken?: string;
};

export function createQuestEventsChannel(config: SubscriptionConfig): RealtimeChannel {
  const supabase = config.accessToken
    ? createBrowserClient(config.accessToken)
    : createBrowserClient();
  const channelName = `surge:v1:quest:${config.questId}:events`;

  const channel = supabase.channel(channelName);

  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'events',
      filter: `quest_id=eq.${config.questId}`,
    },
    (payload) => {
      config.onEvent(payload.new);
    },
  );

  if (config.onStatusChange) {
    channel.subscribe((status) => {
      config.onStatusChange!(status);
    });
  } else {
    channel.subscribe();
  }

  clientInstances.set(channel, supabase);
  return channel;
}

export function destroyChannel(channel: RealtimeChannel) {
  const supabase = clientInstances.get(channel) ?? createBrowserClient();
  supabase.removeChannel(channel);
  clientInstances.delete(channel);
}
