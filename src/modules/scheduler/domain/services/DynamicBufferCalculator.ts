/**
 * @license Apache-2.0
 * Domain Service: DynamicBufferCalculator
 * Pure algorithmic calculation of mandatory buffers based on task priority,
 * energy level, and contextual cognitive switching cost.
 */

import { Priority, EnergyLevel } from '../../../task/domain/entities/Task.ts';

export interface BufferCalculationInput {
  currentPriority: Priority;
  nextPriority?: Priority;
  currentEnergy: EnergyLevel;
  nextEnergy?: EnergyLevel;
  baseBufferMinutes: number;
  isOverrunRecovery?: boolean;
}

export class DynamicBufferCalculator {
  /**
   * Calculates required recovery buffer between two adjacent tasks
   */
  public static calculateBufferMinutes(input: BufferCalculationInput): number {
    let requiredBuffer = input.baseBufferMinutes || 10;

    // 1. High Cognitive Cost / Priority Rules
    if (input.currentPriority === 'URGENT_P0') {
      requiredBuffer = Math.max(requiredBuffer, 20);
    } else if (input.currentPriority === 'HIGH_P1') {
      requiredBuffer = Math.max(requiredBuffer, 15);
    }

    // 2. Deep Work Context Switching Buffer
    if (input.currentEnergy === 'DEEP_WORK' || input.nextEnergy === 'DEEP_WORK') {
      requiredBuffer += 5; // Context switching tax
    }

    // 3. Overrun recovery buffer (add safety margin)
    if (input.isOverrunRecovery) {
      requiredBuffer += 5;
    }

    return requiredBuffer;
  }

  /**
   * Generates non-overlapping time slots ensuring dynamic buffers are respected
   */
  public static adjustSlot(
    startTime: Date,
    durationMinutes: number,
    bufferMinutes: number
  ): { scheduledStart: Date; scheduledEnd: Date; bufferEnd: Date } {
    const startMs = startTime.getTime();
    const endMs = startMs + durationMinutes * 60 * 1000;
    const bufferEndMs = endMs + bufferMinutes * 60 * 1000;

    return {
      scheduledStart: new Date(startMs),
      scheduledEnd: new Date(endMs),
      bufferEnd: new Date(bufferEndMs),
    };
  }
}
