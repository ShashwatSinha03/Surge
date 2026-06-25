import { createBrowserClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

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

  return channel;
}

export function destroyChannel(channel: RealtimeChannel, accessToken?: string) {
  const supabase = accessToken
    ? createBrowserClient(accessToken)
    : createBrowserClient();
  supabase.removeChannel(channel);
}
