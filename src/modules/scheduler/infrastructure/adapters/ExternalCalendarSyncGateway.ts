/**
 * @license Apache-2.0
 * Gateway: Cross-Calendar Synchronization
 * Two-way sync hooks and event mappers for Google Calendar and Microsoft Outlook.
 */

export interface ExternalCalendarEvent {
  id: string;
  provider: 'GOOGLE_CALENDAR' | 'MICROSOFT_OUTLOOK';
  title: string;
  description?: string;
  start: Date;
  end: Date;
  etag: string;
  attendeesCount?: number;
  syncStatus: 'SYNCED' | 'MODIFIED_LOCALLY' | 'CONFLICT';
}

export class ExternalCalendarSyncGateway {
  private static syncedEvents: ExternalCalendarEvent[] = [
    {
      id: 'gcal_ev_101',
      provider: 'GOOGLE_CALENDAR',
      title: 'Sprint Planning & Architecture Sync',
      description: 'Review modular monolith boundaries & BullMQ worker concurrency.',
      start: new Date(Date.now() + 3600000 * 2),
      end: new Date(Date.now() + 3600000 * 3),
      etag: 'etag_v1_001',
      attendeesCount: 4,
      syncStatus: 'SYNCED',
    },
    {
      id: 'outlook_ev_202',
      provider: 'MICROSOFT_OUTLOOK',
      title: 'Security & Compliance Review',
      description: 'Review Supabase JWT signature verification & optimistic locking.',
      start: new Date(Date.now() + 3600000 * 5),
      end: new Date(Date.now() + 3600000 * 6),
      etag: 'etag_v2_002',
      attendeesCount: 2,
      syncStatus: 'SYNCED',
    },
  ];

  public static async pullExternalEvents(): Promise<ExternalCalendarEvent[]> {
    // In production, queries Google Calendar API (v3) / Microsoft Graph Calendar endpoints
    return [...this.syncedEvents];
  }

  public static async pushTaskToCalendar(
    provider: 'GOOGLE_CALENDAR' | 'MICROSOFT_OUTLOOK',
    task: { title: string; scheduledStart: Date; scheduledEnd: Date; description?: string }
  ): Promise<ExternalCalendarEvent> {
    const newEvent: ExternalCalendarEvent = {
      id: `${provider.toLowerCase().slice(0, 4)}_ev_${Date.now()}`,
      provider,
      title: task.title,
      description: task.description,
      start: task.scheduledStart,
      end: task.scheduledEnd,
      etag: `etag_${Date.now()}`,
      attendeesCount: 1,
      syncStatus: 'SYNCED',
    };
    this.syncedEvents.push(newEvent);
    return newEvent;
  }
}
