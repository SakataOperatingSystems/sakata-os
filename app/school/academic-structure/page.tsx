import Link from "next/link";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import {
  createEducationLevel,
  updateEducationLevel,
} from "./education-level-actions";
import {
  createClassLevel,
  updateClassLevel,
} from "./class-level-actions";
import EducationLevelForm from "./education-level-form";
import ClassLevelForm from "./class-level-form";

export default async function AcademicStructurePage() {
  await requirePermission("school.education_levels.read");

  const { organization } = await getOrganizationContext();
  const supabase = await createClient();

  const canManageEducationLevels = await hasPermission(
    "school.education_levels.manage"
  );
  const canManageClassLevels = await hasPermission(
    "school.class_levels.manage"
  );

  const [
    { data: educationLevels, error: educationLevelsError },
    { data: classLevels, error: classLevelsError },
  ] = await Promise.all([
    supabase
      .from("education_levels")
      .select("id, code, name, display_order, status")
      .eq("organization_id", organization.id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("class_levels")
      .select(
        "id, education_level_id, code, name, display_order, status"
      )
      .eq("organization_id", organization.id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (educationLevelsError) {
    throw new Error(
      `Failed to load education levels: ${educationLevelsError.message}`
    );
  }

  if (classLevelsError) {
    throw new Error(
      `Failed to load class levels: ${classLevelsError.message}`
    );
  }

  const educationLevelOptions = (educationLevels ?? []).map((level) => ({
    id: level.id,
    code: level.code,
    name: level.name,
  }));

  const classLevelsByEducationLevel = new Map<
    string,
    Array<{
      id: string;
      education_level_id: string;
      code: string;
      name: string;
      display_order: number;
      status: string;
    }>
  >();

  for (const classLevel of classLevels ?? []) {
    const existing =
      classLevelsByEducationLevel.get(classLevel.education_level_id) ?? [];

    existing.push(classLevel);

    classLevelsByEducationLevel.set(
      classLevel.education_level_id,
      existing
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/school"
            className="text-sm text-slate-500 transition hover:text-slate-300"
          >
            Back to School OS
          </Link>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
                Academic Structure
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Academic Structure
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Configure the academic hierarchy used by SAKATA to construct
                classes and downstream academic operations.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
              {(educationLevels ?? []).length} education levels ·{" "}
              {(classLevels ?? []).length} class levels
            </div>
          </div>
        </div>

        {canManageEducationLevels && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-medium">
                Add education level
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Define a reusable educational stage for this organization.
              </p>
            </div>

            <EducationLevelForm action={createEducationLevel} />
          </section>
        )}

        {canManageClassLevels && educationLevelOptions.length > 0 && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-medium">
                Add class level
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Define a class level under an existing education level.
              </p>
            </div>

            <ClassLevelForm
              action={createClassLevel}
              educationLevels={educationLevelOptions}
            />
          </section>
        )}

        {canManageClassLevels && educationLevelOptions.length === 0 && (
          <section className="mb-8 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-6">
            <h2 className="text-lg font-medium text-amber-300">
              Class levels require an education level
            </h2>

            <p className="mt-2 text-sm text-amber-200/70">
              Create at least one education level before adding class levels.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="font-medium">Education levels</h2>

            <p className="mt-1 text-sm text-slate-500">
              Each education level contains the class levels used to construct
              operational classes.
            </p>
          </div>

          {!educationLevels?.length ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-slate-400">
                No education levels have been configured yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {educationLevels.map((educationLevel) => {
                const levels =
                  classLevelsByEducationLevel.get(educationLevel.id) ?? [];

                return (
                  <div key={educationLevel.id} className="px-6 py-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold">
                            {educationLevel.name}
                          </h3>

                          <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-400">
                            {educationLevel.code}
                          </span>

                          <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-400">
                            {educationLevel.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {levels.length}{" "}
                          {levels.length === 1
                            ? "class level"
                            : "class levels"}
                        </p>

                        {levels.length > 0 && (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {levels.map((level) => (
                              <div
                                key={level.id}
                                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-white">
                                      {level.name}
                                    </p>

                                    <p className="mt-1 font-mono text-xs text-slate-500">
                                      {level.code}
                                    </p>
                                  </div>

                                  <span className="text-xs text-slate-500">
                                    {level.status}
                                  </span>
                                </div>

                                {canManageClassLevels && (
                                  <details className="mt-4">
                                    <summary className="cursor-pointer text-xs text-slate-400 hover:text-white">
                                      Edit class level
                                    </summary>

                                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                                      <ClassLevelForm
                                        action={updateClassLevel}
                                        educationLevels={
                                          educationLevelOptions
                                        }
                                        initialValues={{
                                          id: level.id,
                                          educationLevelId:
                                            level.education_level_id,
                                          code: level.code,
                                          name: level.name,
                                          displayOrder:
                                            level.display_order,
                                          status: level.status,
                                        }}
                                      />
                                    </div>
                                  </details>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {canManageEducationLevels && (
                        <details className="shrink-0">
                          <summary className="cursor-pointer text-sm text-slate-300 hover:text-white">
                            Edit
                          </summary>

                          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 xl:w-[760px]">
                            <EducationLevelForm
                              action={updateEducationLevel}
                              initialValues={{
                                id: educationLevel.id,
                                code: educationLevel.code,
                                name: educationLevel.name,
                                displayOrder:
                                  educationLevel.display_order,
                                status: educationLevel.status,
                              }}
                            />
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/school/classes"
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            Manage Classes
          </Link>

          <Link
            href="/school/academic-periods"
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            Academic Periods
          </Link>
        </section>
      </div>
    </div>
  );
}