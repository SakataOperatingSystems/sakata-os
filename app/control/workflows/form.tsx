"use client";

import { useActionState } from "react";
import {
  createWorkflowDefinition,
  createWorkflowState,
  createWorkflowTransition,
} from "./actions";

type WorkflowStateOption = {
  id: string;
  code: string;
  name: string;
  sequence: number;
  is_initial: boolean;
  is_terminal: boolean;
};

type WorkflowTransitionFormProps = {
  workflowDefinitionId: string;
  states: WorkflowStateOption[];
};

const initialDefinitionState = {
  success: false,
  error: null,
};

const initialStateState = {
  success: false,
  error: null,
};

const initialTransitionState = {
  success: false,
  error: null,
};

const fieldClassName =
  "mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500";

const selectClassName =
  "mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500";

const buttonClassName =
  "inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/30";

const disabledButtonClassName =
  "disabled:cursor-not-allowed disabled:opacity-50";

const labelClassName =
  "mb-2 block text-sm font-medium text-slate-300";

export function WorkflowDefinitionForm() {
  const [state, formAction] = useActionState(
    createWorkflowDefinition,
    initialDefinitionState
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="workflow-definition-code"
          className={labelClassName}
        >
          Workflow code
        </label>
        <input
          id="workflow-definition-code"
          name="code"
          type="text"
          required
          maxLength={100}
          placeholder="student_admission"
          className={fieldClassName}
        />
      </div>

      <div>
        <label
          htmlFor="workflow-definition-name"
          className={labelClassName}
        >
          Workflow name
        </label>
        <input
          id="workflow-definition-name"
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="Student Admission"
          className={fieldClassName}
        />
      </div>

      <div>
        <label
          htmlFor="workflow-definition-description"
          className={labelClassName}
        >
          Description
        </label>
        <textarea
          id="workflow-definition-description"
          name="description"
          rows={3}
          maxLength={5000}
          placeholder="Describe the controlled lifecycle."
          className={`${fieldClassName} resize-y`}
        />
      </div>

      <div>
        <label
          htmlFor="workflow-definition-status"
          className={labelClassName}
        >
          Status
        </label>
        <select
          id="workflow-definition-status"
          name="status"
          defaultValue="active"
          className={selectClassName}
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Workflow definition created successfully.
        </p>
      ) : null}

      <button type="submit" className={buttonClassName}>
        Create workflow
      </button>
    </form>
  );
}

export function WorkflowStateForm({
  workflowDefinitionId,
}: {
  workflowDefinitionId: string;
}) {
  const [state, formAction] = useActionState(
    createWorkflowState,
    initialStateState
  );

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="workflow_definition_id"
        value={workflowDefinitionId}
      />

      <div>
        <label
          className={labelClassName}
          htmlFor={`state-code-${workflowDefinitionId}`}
        >
          State code
        </label>
        <input
          id={`state-code-${workflowDefinitionId}`}
          name="code"
          type="text"
          required
          maxLength={100}
          placeholder="admission_requested"
          className={fieldClassName}
        />
      </div>

      <div>
        <label
          className={labelClassName}
          htmlFor={`state-name-${workflowDefinitionId}`}
        >
          State name
        </label>
        <input
          id={`state-name-${workflowDefinitionId}`}
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="Admission Requested"
          className={fieldClassName}
        />
      </div>

      <div>
        <label
          className={labelClassName}
          htmlFor={`state-description-${workflowDefinitionId}`}
        >
          Description
        </label>
        <textarea
          id={`state-description-${workflowDefinitionId}`}
          name="description"
          rows={3}
          maxLength={5000}
          placeholder="Describe this state."
          className={`${fieldClassName} resize-y`}
        />
      </div>

      <div>
        <label
          className={labelClassName}
          htmlFor={`state-sequence-${workflowDefinitionId}`}
        >
          Sequence
        </label>
        <input
          id={`state-sequence-${workflowDefinitionId}`}
          name="sequence"
          type="number"
          min="0"
          step="1"
          required
          defaultValue="0"
          className={fieldClassName}
        />
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            name="is_initial"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
          Initial state
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            name="is_terminal"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
          Terminal state
        </label>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Workflow state created successfully.
        </p>
      ) : null}

      <button type="submit" className={buttonClassName}>
        Create state
      </button>
    </form>
  );
}

export function WorkflowTransitionForm({
  workflowDefinitionId,
  states,
}: WorkflowTransitionFormProps) {
  const [state, formAction] = useActionState(
    createWorkflowTransition,
    initialTransitionState
  );

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="workflow_definition_id"
        value={workflowDefinitionId}
      />

      <div>
        <label
          className={labelClassName}
          htmlFor={`transition-from-${workflowDefinitionId}`}
        >
          From state
        </label>
        <select
          id={`transition-from-${workflowDefinitionId}`}
          name="from_state_id"
          required
          defaultValue=""
          className={selectClassName}
        >
          <option value="" disabled>
            Select starting state
          </option>
          {states.map((stateOption) => (
            <option key={stateOption.id} value={stateOption.id}>
              {stateOption.sequence}: {stateOption.name} ({stateOption.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className={labelClassName}
          htmlFor={`transition-to-${workflowDefinitionId}`}
        >
          To state
        </label>
        <select
          id={`transition-to-${workflowDefinitionId}`}
          name="to_state_id"
          required
          defaultValue=""
          className={selectClassName}
        >
          <option value="" disabled>
            Select destination state
          </option>
          {states.map((stateOption) => (
            <option key={stateOption.id} value={stateOption.id}>
              {stateOption.sequence}: {stateOption.name} ({stateOption.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className={labelClassName}
          htmlFor={`transition-code-${workflowDefinitionId}`}
        >
          Transition code
        </label>
        <input
          id={`transition-code-${workflowDefinitionId}`}
          name="code"
          type="text"
          required
          maxLength={100}
          placeholder="submit_for_review"
          className={fieldClassName}
        />
      </div>

      <div>
        <label
          className={labelClassName}
          htmlFor={`transition-name-${workflowDefinitionId}`}
        >
          Transition name
        </label>
        <input
          id={`transition-name-${workflowDefinitionId}`}
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="Submit for Review"
          className={fieldClassName}
        />
      </div>

      <div>
        <label
          className={labelClassName}
          htmlFor={`transition-description-${workflowDefinitionId}`}
        >
          Description
        </label>
        <textarea
          id={`transition-description-${workflowDefinitionId}`}
          name="description"
          rows={3}
          maxLength={5000}
          placeholder="Describe what this transition does."
          className={`${fieldClassName} resize-y`}
        />
      </div>

      {states.length < 2 ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Create at least two states before defining a transition.
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Workflow transition created successfully.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={states.length < 2}
        className={`${buttonClassName} ${disabledButtonClassName}`}
      >
        Create transition
      </button>
    </form>
  );
}
