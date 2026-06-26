export type MetricEvent = {
  type: string;
  value?: number;
  tags?: Record<string, string>;
  timestamp?: number;
};

type ErrorEvent = {
  message: string;
  code?: string;
  stack?: string;
  tags?: Record<string, string>;
};

type MetricObserver = (event: MetricEvent) => void;
type ErrorObserver = (event: ErrorEvent) => void;

const metricObservers: MetricObserver[] = [];
const errorObservers: ErrorObserver[] = [];

export function addMetricObserver(observer: MetricObserver): () => void {
  metricObservers.push(observer);
  return () => {
    const idx = metricObservers.indexOf(observer);
    if (idx >= 0) metricObservers.splice(idx, 1);
  };
}

export function addErrorObserver(observer: ErrorObserver): () => void {
  errorObservers.push(observer);
  return () => {
    const idx = errorObservers.indexOf(observer);
    if (idx >= 0) errorObservers.splice(idx, 1);
  };
}

export function emitMetric(event: MetricEvent): void {
  for (const observer of metricObservers) {
    try {
      observer(event);
    } catch {
      // suppress
    }
  }
}

export function emitError(event: ErrorEvent): void {
  for (const observer of errorObservers) {
    try {
      observer(event);
    } catch {
      // suppress
    }
  }
}

export function trackApiCall(
  method: string,
  path: string,
  status: number,
  duration: number,
): void {
  emitMetric({
    type: 'api_call',
    tags: { method, path: path.split('/').slice(0, 4).join('/'), status: String(status) },
    value: duration,
  });
}

export function trackDomainEvent(eventType: string): void {
  emitMetric({
    type: 'domain_event',
    tags: { event_type: eventType },
    value: 1,
  });
}

export function trackError(
  message: string,
  code?: string,
  tags?: Record<string, string>,
): void {
  emitError({ message, code, tags });
}

export function trackRateLimit(
  identifier: string,
  category: string,
): void {
  emitMetric({
    type: 'rate_limit',
    tags: { category },
    value: 1,
  });
}
