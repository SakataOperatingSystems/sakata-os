import { describe, expect, it } from "vitest";
import {
  ADMISSION_OPERATOR_EXCEPTION_LABELS,
  getAdmissionOperatorState,
} from "@/app/school/admissions/validation";

describe("admission operator state", () => {
  it("closes converted admissions", () => {
    expect(
      getAdmissionOperatorState({
        status: "converted",
        applicantDateOfBirth: null,
        requestedAdmissionDate: null,
        workflowStateCode: null,
        workflowTransitionName: null,
      })
    ).toEqual({
      nextAction: "Closed",
      exceptions: [],
    });
  });

  it("closes rejected admissions", () => {
    expect(
      getAdmissionOperatorState({
        status: "rejected",
        applicantDateOfBirth: null,
        requestedAdmissionDate: null,
        workflowStateCode: null,
        workflowTransitionName: null,
      })
    ).toEqual({
      nextAction: "Closed",
      exceptions: [],
    });
  });

  it("closes withdrawn admissions", () => {
    expect(
      getAdmissionOperatorState({
        status: "withdrawn",
        applicantDateOfBirth: null,
        requestedAdmissionDate: null,
        workflowStateCode: null,
        workflowTransitionName: null,
      })
    ).toEqual({
      nextAction: "Closed",
      exceptions: [],
    });
  });

  it("routes approved admissions to student conversion", () => {
    expect(
      getAdmissionOperatorState({
        status: "approved",
        applicantDateOfBirth: null,
        requestedAdmissionDate: null,
        workflowStateCode: "admission_review",
        workflowTransitionName: "Approve admission",
      })
    ).toEqual({
      nextAction: "Convert to Student",
      exceptions: [],
    });
  });

  it("uses the active workflow transition for open admissions", () => {
    expect(
      getAdmissionOperatorState({
        status: "open",
        applicantDateOfBirth: "2012-04-15",
        requestedAdmissionDate: "2027-01-10",
        workflowStateCode: "admission_review",
        workflowTransitionName: "Approve admission",
      })
    ).toEqual({
      nextAction: "Approve admission",
      exceptions: [],
    });
  });

  it("falls back to review when an open admission has no transition", () => {
    expect(
      getAdmissionOperatorState({
        status: "open",
        applicantDateOfBirth: "2012-04-15",
        requestedAdmissionDate: "2027-01-10",
        workflowStateCode: "admission_review",
        workflowTransitionName: null,
      })
    ).toEqual({
      nextAction: "Review admission",
      exceptions: [],
    });
  });

  it("surfaces open-admission information gaps", () => {
    const state = getAdmissionOperatorState({
      status: "open",
      applicantDateOfBirth: null,
      requestedAdmissionDate: null,
      workflowStateCode: null,
      workflowTransitionName: null,
    });

    expect(state.nextAction).toBe("Review admission");
    expect(state.exceptions).toEqual([
      "missing_date_of_birth",
      "missing_requested_admission_date",
      "no_active_workflow",
    ]);

    expect(
      state.exceptions.map(
        (exception) => ADMISSION_OPERATOR_EXCEPTION_LABELS[exception]
      )
    ).toEqual([
      "Missing date of birth",
      "Missing requested date",
      "No active workflow",
    ]);
  });

  it("does not treat missing dates as exceptions after approval", () => {
    expect(
      getAdmissionOperatorState({
        status: "approved",
        applicantDateOfBirth: null,
        requestedAdmissionDate: null,
        workflowStateCode: null,
        workflowTransitionName: null,
      })
    ).toEqual({
      nextAction: "Convert to Student",
      exceptions: [],
    });
  });
});