insert into public.module_configuration_definitions (
    module_definition_id,
    code,
    name,
    description,
    value_type,
    default_value,
    validation_rules,
    is_required,
    status
)
select
    md.id,
    v.code,
    v.name,
    v.description,
    v.value_type,
    v.default_value::jsonb,
    v.validation_rules::jsonb,
    v.is_required,
    'active'
from (
    values
        (
            'attendance',
            'late_threshold_minutes',
            'Late Threshold',
            'Number of minutes after the attendance start time at which a person is classified as late.',
            'integer',
            '15',
            '{"min":0,"max":180}',
            false
        ),
        (
            'attendance',
            'minimum_attendance_percentage',
            'Minimum Attendance Percentage',
            'Minimum attendance percentage used by the organization for attendance monitoring.',
            'decimal',
            '75',
            '{"min":0,"max":100}',
            false
        ),
        (
            'assessments',
            'pass_mark_percentage',
            'Pass Mark Percentage',
            'Default percentage threshold used to classify an assessment result as a pass.',
            'decimal',
            '50',
            '{"min":0,"max":100}',
            false
        ),
        (
            'assessments',
            'grading_method',
            'Grading Method',
            'Method used by the organization to represent assessment outcomes.',
            'select',
            '"percentage"',
            '{"options":["percentage","points","letter"]}',
            true
        ),
        (
            'billing',
            'fee_due_day',
            'Fee Due Day',
            'Default calendar day on which a billed amount becomes due.',
            'integer',
            '10',
            '{"min":1,"max":31}',
            false
        ),
        (
            'billing',
            'overdue_grace_days',
            'Overdue Grace Period',
            'Number of days allowed after the due date before an account is classified as overdue.',
            'integer',
            '7',
            '{"min":0,"max":90}',
            false
        ),
        (
            'payments',
            'require_payment_reference',
            'Require Payment Reference',
            'Determines whether a payment reference is required when recording a payment.',
            'boolean',
            'true',
            '{}',
            true
        ),
        (
            'alerts',
            'attendance_alert_threshold',
            'Attendance Alert Threshold',
            'Attendance percentage below which an operational alert may be generated.',
            'decimal',
            '80',
            '{"min":0,"max":100}',
            false
        ),
        (
            'tasks',
            'default_task_priority',
            'Default Task Priority',
            'Default priority assigned to newly created tasks when no priority is explicitly selected.',
            'select',
            '"medium"',
            '{"options":["low","medium","high","critical"]}',
            true
        ),
        (
            'tasks',
            'default_task_due_days',
            'Default Task Due Period',
            'Default number of days allowed for a newly created task before its due date.',
            'integer',
            '7',
            '{"min":0,"max":365}',
            false
        ),
        (
            'calendar',
            'week_start_day',
            'Week Start Day',
            'Day on which the organization calendar week begins.',
            'select',
            '"monday"',
            '{"options":["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]}',
            true
        ),
        (
            'admissions',
            'admission_number_prefix',
            'Admission Number Prefix',
            'Prefix used when generating admission identifiers.',
            'text',
            '"ADM"',
            '{"max_length":20}',
            false
        )
) as v(
    module_code,
    code,
    name,
    description,
    value_type,
    default_value,
    validation_rules,
    is_required
)
join public.module_definitions md
    on md.code = v.module_code
   and md.status = 'active'
on conflict (module_definition_id, code)
do update set
    name = excluded.name,
    description = excluded.description,
    value_type = excluded.value_type,
    default_value = excluded.default_value,
    validation_rules = excluded.validation_rules,
    is_required = excluded.is_required,
    status = excluded.status;

