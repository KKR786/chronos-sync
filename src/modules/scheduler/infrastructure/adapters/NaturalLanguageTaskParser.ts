/**
 * @license Apache-2.0
 * NLP Engine: Natural Language Task Parser
 * Parses natural language scheduling utterances into structured Task entities.
 */

import { Priority, EnergyLevel } from '../../../task/domain/entities/Task.ts';

export interface ParsedNLPTask {
  rawQuery: string;
  extractedTitle: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  estimatedMinutes: number;
  priority: Priority;
  energyLevel: EnergyLevel;
  requiredTools: string[];
  confidenceScore: number;
}

export class NaturalLanguageTaskParser {
  public static parse(
    query: string,
    userTimezone: string = 'UTC',
    timezoneOffsetMinutes?: number,
    clientNowIso?: string
  ): ParsedNLPTask {
    const text = query.trim();
    let title = text;
    let estimatedMinutes = 30;
    let priority: Priority = 'MEDIUM_P2';
    let energyLevel: EnergyLevel = 'MEDIUM_FOCUS';
    const requiredTools: string[] = [];
    let scheduledStart: Date | null = null;
    let confidenceScore = 0.85;

    // 1. Priority Detection
    if (/#?(urgent|asap|critical|p0|blocker)\b/i.test(text)) {
      priority = 'URGENT_P0';
      title = title.replace(/#?\b(urgent|asap|critical|p0|blocker)\b/gi, '').trim();
    } else if (/#?(high\s*priority|important|p1)\b/i.test(text)) {
      priority = 'HIGH_P1';
      title = title.replace(/#?\b(high\s*priority|important|p1)\b/gi, '').trim();
    } else if (/#?(low\s*priority|trivial|when\s*free|p3)\b/i.test(text)) {
      priority = 'LOW_P3';
      title = title.replace(/#?\b(low\s*priority|trivial|when\s*free|p3)\b/gi, '').trim();
    }

    // 2. Energy Level Detection
    if (/#?(deep\s*work|flow\s*state|heavy\s*coding|architecture)\b/i.test(text)) {
      energyLevel = 'DEEP_WORK';
      title = title.replace(/#?\b(deep\s*work|flow\s*state|heavy\s*coding|architecture)\b/gi, '').trim();
    } else if (/#?(high\s*focus|complex)\b/i.test(text)) {
      energyLevel = 'HIGH_FOCUS';
      title = title.replace(/#?\b(high\s*focus|complex)\b/gi, '').trim();
    } else if (/#?(low\s*energy|easy|chill|admin|quick\s*read)\b/i.test(text)) {
      energyLevel = 'LOW_ENERGY';
      title = title.replace(/#?\b(low\s*energy|easy|chill|admin|quick\s*read)\b/gi, '').trim();
    }

    // 3. Duration Detection (e.g., "for 45m", "for 60m", "for 1 hour", "90 mins", "2h")
    const durationMatch = text.match(/(?:for\s+)?(\d+)\s*(mins?|minutes?|m|hours?|hrs?|h)\b/i);
    if (durationMatch) {
      const val = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('h')) {
        estimatedMinutes = val * 60;
      } else {
        estimatedMinutes = val;
      }
      title = title.replace(durationMatch[0], '').trim();
    }

    // 4. Tools extraction (e.g. "with IDE", "in Figma", "via Terminal", "in Notion")
    const toolsRegex = /\b(?:with|in|via)\s+(vscode|ide|figma|terminal|postman|github|notion|chrome|slack)\b/gi;
    let matchTool: RegExpExecArray | null;
    while ((matchTool = toolsRegex.exec(text)) !== null) {
      requiredTools.push(matchTool[1].toUpperCase());
      title = title.replace(matchTool[0], '').trim();
    }

    // 5. Date & Time Detection with Client Timezone Offset Awareness
    const tzOffset = typeof timezoneOffsetMinutes === 'number'
      ? timezoneOffsetMinutes
      : new Date().getTimezoneOffset();

    // Determine user's local date/time
    const baseDate = clientNowIso ? new Date(clientNowIso) : new Date();
    // User local milliseconds = UTC - (tzOffset * 60 * 1000)
    const userLocalMs = baseDate.getTime() - (tzOffset * 60 * 1000);
    const localNow = new Date(userLocalMs);

    let targetYear = localNow.getUTCFullYear();
    let targetMonth = localNow.getUTCMonth();
    let targetDay = localNow.getUTCDate();

    const isTomorrow = /\btomorrow\b/i.test(text);
    const isToday = /\btoday\b/i.test(text);
    const dayOfWeekMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);

    if (isTomorrow) {
      targetDay += 1;
      title = title.replace(/\btomorrow\b/gi, '').trim();
    } else if (isToday) {
      title = title.replace(/\btoday\b/gi, '').trim();
    } else if (dayOfWeekMatch) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIdx = days.indexOf(dayOfWeekMatch[1].toLowerCase());
      const currentDayIdx = localNow.getUTCDay();
      let diff = targetDayIdx - currentDayIdx;
      if (diff <= 0) diff += 7; // Next occurrence
      targetDay += diff;
      title = title.replace(new RegExp(`\\b${dayOfWeekMatch[1]}\\b`, 'gi'), '').trim();
    }

    // Time of day detection:
    // Pattern 1: [at] 4pm, [at] 4:30 pm, 4:00pm
    // Pattern 2: at 16:00 or 14:30
    // Pattern 3: at 4 (contextual time)
    let parsedHours: number | null = null;
    let parsedMinutes = 0;

    const meridiemMatch = text.match(/(?:\bat\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    const militaryMatch = text.match(/\bat\s+(\d{1,2}):(\d{2})\b/i);
    const simpleAtMatch = text.match(/\bat\s+(\d{1,2})\b/i);

    if (meridiemMatch) {
      let h = parseInt(meridiemMatch[1], 10);
      const m = meridiemMatch[2] ? parseInt(meridiemMatch[2], 10) : 0;
      const meridiem = meridiemMatch[3].toLowerCase();

      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;

      parsedHours = h;
      parsedMinutes = m;
      title = title.replace(meridiemMatch[0], '').trim();
    } else if (militaryMatch) {
      parsedHours = parseInt(militaryMatch[1], 10);
      parsedMinutes = parseInt(militaryMatch[2], 10);
      title = title.replace(militaryMatch[0], '').trim();
    } else if (simpleAtMatch) {
      let h = parseInt(simpleAtMatch[1], 10);
      // Default assume business hours: 1..7 -> PM (13..19), 8..12 -> AM
      if (h >= 1 && h <= 7) h += 12;
      parsedHours = h;
      parsedMinutes = 0;
      title = title.replace(simpleAtMatch[0], '').trim();
    } else if (isTomorrow || isToday || dayOfWeekMatch) {
      // Default to 10:00 AM local time if date mentioned without explicit time
      parsedHours = 10;
      parsedMinutes = 0;
    }

    if (parsedHours !== null) {
      // Convert user local date & time into UTC timestamp:
      // Date.UTC returns UTC ms for the given components.
      // Since tzOffset = (UTC - Local) in minutes:
      // UTC ms = Local ms + (tzOffset * 60 * 1000)
      const utcMs = Date.UTC(targetYear, targetMonth, targetDay, parsedHours, parsedMinutes, 0, 0) + (tzOffset * 60 * 1000);
      scheduledStart = new Date(utcMs);
    }

    // Clean up hashtag keywords like #deepwork, #urgent, or stray hash symbols
    title = title.replace(/#\w*/g, '').trim();

    // Clean up residual prepositions, quotes, and symbols
    title = title
      .replace(/^[\s,–#-]+|[\s,–#-]+$/g, '')
      .replace(/^["']+|["']+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!title || title.length < 2) {
      title = query;
    }

    const scheduledEnd = scheduledStart
      ? new Date(scheduledStart.getTime() + estimatedMinutes * 60 * 1000)
      : null;

    return {
      rawQuery: query,
      extractedTitle: title,
      scheduledStart,
      scheduledEnd,
      estimatedMinutes,
      priority,
      energyLevel,
      requiredTools,
      confidenceScore,
    };
  }
}
