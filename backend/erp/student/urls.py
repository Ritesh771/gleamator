from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='api-login'),
    path('register/', views.register_view, name='api-register'),
    path('token/refresh/', views.token_refresh, name='token-refresh'),

    path('students/', views.students_list_create, name='students-list-create'),
    path('students/<int:student_id>/', views.students_detail, name='students-detail'),
    path('students/template/', views.students_template, name='students-template'),
    path('students/bulk_upload/', views.students_bulk_upload, name='students-bulk-upload'),
    path('students/bulk_delete/', views.students_bulk_delete, name='students-bulk-delete'),

    path('users/', views.users_list_create, name='users-list-create'),
    path('users/<int:user_id>/', views.users_detail, name='users-detail'),

    path('faculty/', views.faculty_list_create, name='faculty-list-create'),
    path('faculty/<int:faculty_id>/', views.faculty_detail, name='faculty-detail'),
    path('hods/', views.hods_list_create, name='hods-list-create'),
    path('faculty/dashboard/', views.faculty_dashboard_stats, name='faculty-dashboard-stats'),
    path('faculty/attendance/trends/', views.faculty_attendance_trends, name='faculty-attendance-trends'),

    path('subjects/', views.subjects_list_create, name='subjects-list-create'),
    path('subjects/<int:subject_id>/', views.subjects_detail, name='subjects-detail'),

    path('attendance/take/', views.attendance_take, name='attendance-take'),
    path('attendance/records/', views.attendance_records_list, name='attendance-records-list'),
    path('attendance/session/<int:session_id>/students/', views.attendance_session_students, name='attendance-session-students'),
    path('attendance/export/', views.attendance_export, name='attendance-export'),
    path('attendance/student/<int:student_id>/', views.attendance_student, name='attendance-student'),
    path('attendance/report/', views.attendance_report, name='attendance-report'),
    # Departments
    path('departments/', views.departments_list_create, name='departments-list-create'),
    path('departments/<int:dept_id>/', views.departments_detail, name='departments-detail'),
    path('departments/<int:dept_id>/assign_hod/', views.assign_hod, name='departments-assign-hod'),

    # Faculty-Subject assignments
    path('faculty-subjects/', views.facultysubject_list_create, name='facultysubject-list-create'),
    path('faculty-subjects/<int:fs_id>/', views.facultysubject_detail, name='facultysubject-detail'),

    # Marks
    path('marks/upload/', views.upload_marks, name='marks-upload'),
    path('marks/student/<int:student_id>/', views.marks_student, name='marks-student'),

    # Stats
    path('stats/department/<str:code>/', views.stats_department, name='stats-department'),
    path('stats/overview/', views.stats_overview, name='stats-overview'),
    path('stats/admin/', views.stats_admin, name='stats-admin'),
]
