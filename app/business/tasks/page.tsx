import TasksPage from "@/app/control/tasks/page";

export default function BusinessTasksPage() {
  return (
    <TasksPage
      workspaceName="Business OS"
      includeSchoolWorkflowContext={false}
    />
  );
}
