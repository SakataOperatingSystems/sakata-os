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

export function WorkflowDefinitionForm() {
  const [state, formAction] = useActionState(
    createWorkflowDefinition,
    initialDefinitionState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="workflow-definition-code"
          className="block text-sm font-medium"
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
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="workflow-definition-name"
          className="block text-sm font-medium"
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
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="workflow-definition-description"
          className="block text-sm font-medium"
        >
          Description
        </label>
        <textarea
          id="workflow-definition-description"
          name="description"
          rows={3}
          maxLength={5000}
          placeholder="Describe the controlled lifecycle."
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="workflow-definition-status"
          className="block text-sm font-medium"
        >
          Status
        </label>
        <select
          id="workflow-definition-status"
          name="status"
          defaultValue="active"
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      {state.success ? (
        <p className="text-sm text-green-600">
          Workflow definition created successfully.
        </p>
      ) : null}

      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
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
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="workflow_definition_id"
        value={workflowDefinitionId}
      />

      <div>
        <label className="block text-sm font-medium" htmlFor={`state-code-${workflowDefinitionId}`}>
          State code
        </label>
        <input
          id={`state-code-${workflowDefinitionId}`}
          name="code"
          type="text"
          required
          maxLength={100}
          placeholder="admission_requested"
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor={`state-name-${workflowDefinitionId}`}>
          State name
        </label>
        <input
          id={`state-name-${workflowDefinitionId}`}
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="Admission Requested"
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          className="block text-sm font-medium"
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
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          className="block text-sm font-medium"
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
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            name="is_initial"
            type="checkbox"
            value="true"
          />
          Initial state
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            name="is_terminal"
            type="checkbox"
            value="true"
          />
          Terminal state
        </label>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      {state.success ? (
        <p className="text-sm text-green-600">
          Workflow state created successfully.
        </p>
      ) : null}

      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
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
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="workflow_definition_id"
        value={workflowDefinitionId}
      />

      <div>
        <label
          className="block text-sm font-medium"
          htmlFor={`transition-from-${workflowDefinitionId}`}
        >
          From state
        </label>
        <select
          id={`transition-from-${workflowDefinitionId}`}
          name="from_state_id"
          required
          defaultValue=""
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
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
          className="block text-sm font-medium"
          htmlFor={`transition-to-${workflowDefinitionId}`}
        >
          To state
        </label>
        <select
          id={`transition-to-${workflowDefinitionId}`}
          name="to_state_id"
          required
          defaultValue=""
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
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
          className="block text-sm font-medium"
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
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          className="block text-sm font-medium"
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
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          className="block text-sm font-medium"
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
          className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {states.length < 2 ? (
        <p className="text-sm text-amber-700">
          Create at least two states before defining a transition.
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      {state.success ? (
        <p className="text-sm text-green-600">
          Workflow transition created successfully.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={states.length < 2}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Create transition
      </button>
    </form>
  );
}
