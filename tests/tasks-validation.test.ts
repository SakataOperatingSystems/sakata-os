import { describe, expect, it } from "vitest";
import {
  getTaskExceptions,
  isValidTaskStateTransition,
  TASK_STATE_TRANSITIONS,
} from "@/app/control/tasks/validation";

describe("task state transitions", () => {
  it("allows open to remain open", () => {
    expect(isValidTaskStateTransition("open", "open")).toBe(true);
  });

  it("allows open to move to in_progress", () => {
    expect(isValidTaskStateTransition("open", "in_progress")).toBe(true);
  });

  it("allows open to be cancelled", () => {
    expect(isValidTaskStateTransition("open", "cancelled")).toBe(true);
  });

  it("blocks open to completed", () => {
    expect(isValidTaskStateTransition("open", "completed")).toBe(false);
  });

  it("allows in_progress to return to open", () => {
    expect(isValidTaskStateTransition("in_progress", "open")).toBe(true);
  });

  it("allows in_progress to complete", () => {
    expect(isValidTaskStateTransition("in_progress", "completed")).toBe(true);
  });

  it("allows in_progress to be cancelled", () => {
    expect(isValidTaskStateTransition("in_progress", "cancelled")).toBe(true);
  });

  it("blocks in_progress from jumping to an unknown state", () => {
    expect(
      (TASK_STATE_TRANSITIONS.in_progress as readonly string[]).includes(
        "unknown"
      )
    ).toBe(false);
  });

  it("keeps completed terminal", () => {
    expect(isValidTaskStateTransition("completed", "completed")).toBe(true);
    expect(isValidTaskStateTransition("completed", "open")).toBe(false);
    expect(isValidTaskStateTransition("completed", "in_progress")).toBe(false);
    expect(isValidTaskStateTransition("completed", "cancelled")).toBe(false);
  });

  it("keeps cancelled terminal", () => {
    expect(isValidTaskStateTransition("cancelled", "cancelled")).toBe(true);
    expect(isValidTaskStateTransition("cancelled", "open")).toBe(false);
    expect(isValidTaskStateTransition("cancelled", "in_progress")).toBe(false);
    expect(isValidTaskStateTransition("cancelled", "completed")).toBe(false);
  });

  it("returns no exceptions for completed tasks", () => {
    expect(
      getTaskExceptions(
        "completed",
        null,
        null,
        new Date("2026-09-26T10:00:00.000Z")
      )
    ).toEqual([]);
  });

  it("returns no exceptions for cancelled tasks", () => {
    expect(
      getTaskExceptions(
        "cancelled",
        null,
        "2026-09-25T10:00:00.000Z",
        new Date("2026-09-26T10:00:00.000Z")
      )
    ).toEqual([]);
  });

  it("returns both assignment and planning exceptions", () => {
    expect(
      getTaskExceptions(
        "open",
        null,
        null,
        new Date("2026-09-26T10:00:00.000Z")
      )
    ).toEqual(["unassigned", "no_deadline"]);
  });

  it("returns no_deadline for an assigned active task without a deadline", () => {
    expect(
      getTaskExceptions(
        "in_progress",
        "11111111-1111-4111-8111-111111111111",
        null,
        new Date("2026-09-26T10:00:00.000Z")
      )
    ).toEqual(["no_deadline"]);
  });

  it("returns overdue for an assigned task past its deadline", () => {
    expect(
      getTaskExceptions(
        "in_progress",
        "11111111-1111-4111-8111-111111111111",
        "2026-09-26T09:00:00.000Z",
        new Date("2026-09-26T10:00:00.000Z")
      )
    ).toEqual(["overdue"]);
  });

  it("returns no exception for an assigned task with a future deadline", () => {
    expect(
      getTaskExceptions(
        "open",
        "11111111-1111-4111-8111-111111111111",
        "2026-09-26T11:00:00.000Z",
        new Date("2026-09-26T10:00:00.000Z")
      )
    ).toEqual([]);
  });});


