from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import AttendanceRecord, AttendanceSession, FacultySubject, User, Department, Faculty, Student, Subject


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ('Role', {'fields': ('role',)}),
    )

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'hod', 'created_at')
    search_fields = ('name', 'code')
    list_filter = ('created_at',)   

@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('user', 'department', 'designation', 'phone', 'joining_date')
    search_fields = ('user__username', 'department__name', 'designation')
    list_filter = ('joining_date',)

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('user', 'department', 'usn', 'semester')
    search_fields = ('user__username', 'department__name', 'usn')
    list_filter = ('semester',)

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'department', 'semester', 'credits')
    search_fields = ('name', 'code', 'department__name')
    list_filter = ('semester',) 



@admin.register(FacultySubject)
class FacultySubjectAdmin(admin.ModelAdmin):
    list_display = ('faculty', 'subject', 'semester', 'section')
    search_fields = ('faculty__user__username', 'subject__name')
    list_filter = ('semester',)

@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ('faculty', 'subject', 'date')
    search_fields = ('faculty__user__username', 'subject__name')
    list_filter = ('date',)

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('student', 'session', 'status')
    search_fields = ('student__user__username', 'session__date')
    list_filter = ('status',)