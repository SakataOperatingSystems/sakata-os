export type ModuleDestination = {
  href: string;
  label: string;
};

const implementedModuleDestinations: Record<string, ModuleDestination> = {
  business_os_tasks_projects: {
    href: "/business/tasks",
    label: "Tasks",
  },
  education_os_admissions_enquiries: {
    href: "/school/admissions",
    label: "Admissions",
  },
  education_os_student_information: {
    href: "/school/students",
    label: "Students",
  },
  education_os_classrooms_timetables: {
    href: "/school/classes",
    label: "Classes",
  },
  education_os_attendance: {
    href: "/school/attendance",
    label: "Attendance",
  },
  education_os_fees_billing: {
    href: "/school/finance",
    label: "School finance",
  },
  education_os_staff_hr: {
    href: "/school/staff",
    label: "Staff",
  },
};

export function getModuleDestination(
  moduleCode: string,
): ModuleDestination | null {
  return implementedModuleDestinations[moduleCode] ?? null;
}
