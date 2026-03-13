import json
from datetime import date

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.shortcuts import get_object_or_404

from .models import (
    User, Department, Faculty, Student, Subject,
    FacultySubject, AttendanceSession, AttendanceRecord, Marks
)
from .auth import generate_jwt, decode_jwt, require_auth
from .auth import generate_refresh_token
from django.utils import timezone
import csv
from django.http import HttpResponse


def _json(data, status=200):
    return JsonResponse(data, safe=False, status=status)


def paginate_queryset(qs, request):
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
    except Exception:
        page = 1
        page_size = 20
    if page_size > 100:
        page_size = 100
    start = (page - 1) * page_size
    end = start + page_size
    return qs[start:end], {'page': page, 'page_size': page_size}


@csrf_exempt
def register_view(request):
    if request.method != 'POST':
        return _json({'error': 'method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
    except Exception:
        return _json({'error': 'invalid json'}, status=400)

    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    role = data.get('role', 'STUDENT')

    if not username or not password:
        return _json({'error': 'username and password required'}, status=400)

    if User.objects.filter(username=username).exists():
        return _json({'error': 'username exists'}, status=400)

    user = User.objects.create(
        username=username,
        first_name=data.get('first_name',''),
        last_name=data.get('last_name',''),
        email=email or '',
        password=make_password(password),
        role=role
    )

    # create role-specific profile
    if role == 'FACULTY':
        dept_id = data.get('department_id')
        if not dept_id:
            return _json({'error': 'department_id required for faculty'}, status=400)
        try:
            dept = Department.objects.get(id=dept_id)
        except Department.DoesNotExist:
            return _json({'error': 'invalid department_id'}, status=400)
        Faculty.objects.create(user=user, department=dept, designation=data.get('designation',''), phone=data.get('phone',''), joining_date=data.get('joining_date', date.today()))
    if role == 'STUDENT':
        usn = data.get('usn') or f"USN{user.id}"
        dept_id = data.get('department_id')
        if not dept_id:
            return _json({'error': 'department_id required for student'}, status=400)
        try:
            dept = Department.objects.get(id=dept_id)
        except Department.DoesNotExist:
            return _json({'error': 'invalid department_id'}, status=400)
        Student.objects.create(user=user, usn=usn, department=dept, semester=data.get('semester',1), section=data.get('section','A'), phone=data.get('phone',''), address=data.get('address',''), admission_date=data.get('admission_date', date.today()))

    token = generate_jwt(user)
    return _json({'token': token, 'user': {'id': user.id, 'username': user.username, 'role': user.role}})


@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return _json({'error': 'method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
    except Exception:
        return _json({'error': 'invalid json'}, status=400)

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username=username, password=password)
    if not user:
        try:
            u = User.objects.get(username=username)
            if not check_password(password, u.password):
                return _json({'error': 'invalid credentials'}, status=401)
            user = u
        except User.DoesNotExist:
            return _json({'error': 'invalid credentials'}, status=401)

    access = generate_jwt(user)
    refresh = generate_refresh_token(user)
    return _json({'access': access, 'refresh': refresh, 'user': {'id': user.id, 'username': user.username, 'role': user.role}})


@csrf_exempt
def token_refresh(request):
    if request.method != 'POST':
        return _json({'error': 'method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
    except Exception:
        return _json({'error': 'invalid json'}, status=400)
    token = data.get('refresh')
    if not token:
        return _json({'error': 'refresh token required'}, status=400)
    payload = decode_jwt(token)
    if not payload or payload.get('type') != 'refresh':
        return _json({'error': 'invalid refresh token'}, status=401)
    jti = payload.get('jti')
    try:
        rt = RefreshToken.objects.get(jti=jti, revoked=False)
    except Exception:
        return _json({'error': 'invalid or revoked refresh token'}, status=401)
    if rt.expires_at < timezone.now():
        return _json({'error': 'refresh token expired'}, status=401)
    # rotate: revoke old and issue new refresh
    rt.revoked = True
    rt.save()
    user = rt.user
    new_refresh = generate_refresh_token(user)
    new_access = generate_jwt(user)
    return _json({'access': new_access, 'refresh': new_refresh})


# Students
@csrf_exempt
@require_auth(allowed=['ADMIN','HOD'])
def students_list_create(request):
    if request.method == 'GET':
        user = request.request_user
        search = request.GET.get('search')
        dept_filter = request.GET.get('department')
        semester_filter = request.GET.get('semester')
        section_filter = request.GET.get('section')
        if user.role == 'HOD':
            dept = Department.objects.filter(hod=user).first()
            qs = Student.objects.select_related('user','department').filter(department=dept)
        else:
            qs = Student.objects.select_related('user','department').all()
        if search:
            qs = qs.filter(user__username__icontains=search) | qs.filter(usn__icontains=search)
        if dept_filter:
            qs = qs.filter(department__code__iexact=dept_filter)
        if semester_filter:
            qs = qs.filter(semester=int(semester_filter))
        if section_filter:
            qs = qs.filter(section__iexact=section_filter)
        page_qs, meta = paginate_queryset(list(qs), request)
        out = [{
            'id': s.id,
            'username': s.user.username,
            'usn': s.usn,
            'email': s.user.email,
            'department': s.department.name if s.department else None,
            'semester': s.semester,
            'section': s.section,
        } for s in page_qs]
        return _json({'results': out, 'meta': meta})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        usn = data.get('usn')
        dept_id = data.get('department_id')
        if not dept_id:
            return _json({'error': 'department_id required for student'}, status=400)
        try:
            dept = Department.objects.get(id=dept_id)
        except Department.DoesNotExist:
            return _json({'error': 'invalid department_id'}, status=400)
        if request.request_user.role == 'HOD' and dept and dept.hod != request.request_user:
            return _json({'error': 'forbidden'}, status=403)
        if User.objects.filter(username=username).exists():
            return _json({'error': 'username exists'}, status=400)
        user = User.objects.create(username=username, email=email or '', password=make_password(password), role='STUDENT')
        student = Student.objects.create(user=user, usn=usn or f"USN{user.id}", department=dept, semester=data.get('semester',1), section=data.get('section','A'), phone=data.get('phone',''), address=data.get('address',''), admission_date=data.get('admission_date', date.today()))
        return _json({'id': student.id, 'username': user.username})

    return _json({'error': 'method not allowed'}, status=405)


@csrf_exempt
def students_detail(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    if request.method == 'GET':
        auth_header = request.META.get('HTTP_AUTHORIZATION','')
        if auth_header.startswith('Bearer '):
            payload = decode_jwt(auth_header.split(' ',1)[1])
        else:
            payload = None
        if payload and payload.get('role') == 'STUDENT' and payload.get('user_id') != student.user.id:
            return _json({'error': 'forbidden'}, status=403)
        if payload and payload.get('role') == 'HOD':
            hod_user = User.objects.filter(id=payload.get('user_id')).first()
            dept = Department.objects.filter(hod=hod_user).first()
            if dept and student.department != dept:
                return _json({'error': 'forbidden'}, status=403)
        return _json({
            'id': student.id,
            'username': student.user.username,
            'usn': student.usn,
            'email': student.user.email,
            'department': student.department.name if student.department else None,
            'semester': student.semester,
            'section': student.section,
        })

    # modifications require admin/hod
    @require_auth(allowed=['ADMIN','HOD'])
    def _modify(req, student=student):
        if req.method == 'PUT':
            try:
                data = json.loads(req.body)
            except Exception:
                return _json({'error': 'invalid json'}, status=400)
            student.semester = data.get('semester', student.semester)
            student.section = data.get('section', student.section)
            student.phone = data.get('phone', student.phone)
            student.address = data.get('address', student.address)
            student.save()
            return _json({'status': 'updated'})

        if req.method == 'DELETE':
            student.user.delete()
            return _json({'status': 'deleted'})

        return _json({'error': 'method not allowed'}, status=405)

    return _modify(request)


# Faculty
@csrf_exempt
@require_auth(allowed=['ADMIN','HOD'])
def faculty_list_create(request):
    if request.method == 'GET':
        user = request.request_user
        search = request.GET.get('search')
        dept_filter = request.GET.get('department')
        if user.role == 'HOD':
            dept = Department.objects.filter(hod=user).first()
            qs = Faculty.objects.select_related('user','department').filter(department=dept)
        else:
            qs = Faculty.objects.select_related('user','department').all()
        if search:
            qs = qs.filter(user__username__icontains=search)
        if dept_filter:
            qs = qs.filter(department__code__iexact=dept_filter)
        page_qs, meta = paginate_queryset(list(qs), request)
        out = [{
            'id': f.id,
            'username': f.user.username,
            'email': f.user.email,
            'department': f.department.name if f.department else None,
            'designation': f.designation,
        } for f in page_qs]
        return _json({'results': out, 'meta': meta})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        dept_id = data.get('department_id')
        if not dept_id:
            return _json({'error': 'department_id required for faculty'}, status=400)
        try:
            dept = Department.objects.get(id=dept_id)
        except Department.DoesNotExist:
            return _json({'error': 'invalid department_id'}, status=400)
        if request.request_user.role == 'HOD' and dept and dept.hod != request.request_user:
            return _json({'error': 'forbidden'}, status=403)
        if User.objects.filter(username=username).exists():
            return _json({'error': 'username exists'}, status=400)
        user = User.objects.create(username=username, first_name=data.get('first_name',''), last_name=data.get('last_name',''), email=email or '', password=make_password(password), role='FACULTY')
        faculty = Faculty.objects.create(user=user, department=dept, designation=data.get('designation',''), phone=data.get('phone',''), joining_date=data.get('joining_date', date.today()))
        return _json({'id': faculty.id, 'username': user.username})

    return _json({'error': 'method not allowed'}, status=405)


# Users (all auth users listing for admin)
@csrf_exempt
@require_auth(allowed=['ADMIN'])
def users_list_create(request):
    if request.method == 'GET':
        search = request.GET.get('search')
        role_filter = request.GET.get('role')
        qs = User.objects.all()
        if search:
            qs = qs.filter(username__icontains=search) | qs.filter(first_name__icontains=search) | qs.filter(last_name__icontains=search)
        if role_filter:
            qs = qs.filter(role__iexact=role_filter)
        page_qs, meta = paginate_queryset(list(qs), request)
        out = [{'id': u.id, 'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name, 'email': u.email, 'role': u.role} for u in page_qs]
        return _json({'results': out, 'meta': meta})

    return _json({'error': 'method not allowed'}, status=405)


# Faculty detail (get/update/delete)
@csrf_exempt
@require_auth(allowed=['ADMIN','HOD'])
def faculty_detail(request, faculty_id):
    faculty = get_object_or_404(Faculty, id=faculty_id)
    user = request.request_user
    # HOD may only operate within their department
    if user.role == 'HOD':
        dept = Department.objects.filter(hod=user).first()
        if not dept or faculty.department != dept:
            return _json({'error': 'forbidden'}, status=403)

    if request.method == 'GET':
        return _json({'id': faculty.id, 'username': faculty.user.username, 'first_name': faculty.user.first_name, 'last_name': faculty.user.last_name, 'email': faculty.user.email, 'department': faculty.department.name if faculty.department else None, 'designation': faculty.designation, 'phone': faculty.phone})

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        faculty.user.first_name = data.get('first_name', faculty.user.first_name)
        faculty.user.last_name = data.get('last_name', faculty.user.last_name)
        faculty.user.email = data.get('email', faculty.user.email)
        faculty.user.save()
        faculty.designation = data.get('designation', faculty.designation)
        faculty.phone = data.get('phone', faculty.phone)
        faculty.save()
        return _json({'status': 'updated'})

    if request.method == 'DELETE':
        faculty.user.delete()
        return _json({'status': 'deleted'})

    return _json({'error': 'method not allowed'}, status=405)


# Subjects
@csrf_exempt
def subjects_list_create(request):
    if request.method == 'GET':
        search = request.GET.get('search')
        dept_filter = request.GET.get('department')
        semester_filter = request.GET.get('semester')
        qs = Subject.objects.select_related('department').all()
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(code__icontains=search)
        if dept_filter:
            qs = qs.filter(department__code__iexact=dept_filter)
        if semester_filter:
            qs = qs.filter(semester=int(semester_filter))
        page_qs, meta = paginate_queryset(list(qs), request)
        out = [{
            'id': s.id,
            'name': s.name,
            'code': s.code,
            'department': s.department.name if s.department else None,
            'semester': s.semester,
            'credits': s.credits,
        } for s in page_qs]
        return _json({'results': out, 'meta': meta})

    if request.method == 'POST':
        # only admin/hod
        auth_header = request.META.get('HTTP_AUTHORIZATION','')
        if not auth_header.startswith('Bearer '):
            return _json({'error': 'authentication required'}, status=401)
        payload = decode_jwt(auth_header.split(' ',1)[1])
        if not payload or payload.get('role') not in ['ADMIN','HOD']:
            return _json({'error': 'forbidden'}, status=403)
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        name = data.get('name')
        code = data.get('code')
        dept = Department.objects.get(id=data.get('department_id')) if data.get('department_id') else None
        subject = Subject.objects.create(name=name, code=code, department=dept, semester=data.get('semester',1), credits=data.get('credits',3))
        return _json({'id': subject.id, 'name': subject.name})

    return _json({'error': 'method not allowed'}, status=405)


# Attendance: faculty takes attendance (faculty derived from token)
@csrf_exempt
@require_auth(allowed=['FACULTY'])
def attendance_take(request):
    if request.method != 'POST':
        return _json({'error': 'method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
    except Exception:
        return _json({'error': 'invalid json'}, status=400)

    subject_id = data.get('subject_id')
    date_str = data.get('date')
    records = data.get('records', [])
    section = data.get('section')
    semester = data.get('semester')

    subject = get_object_or_404(Subject, id=subject_id)
    faculty = get_object_or_404(Faculty, user__id=request.request_user.id)

    sem = semester or subject.semester
    sec = section or (records[0].get('section') if records else None)
    assigned = FacultySubject.objects.filter(faculty=faculty, subject=subject, semester=sem)
    if sec:
        assigned = assigned.filter(section=sec)
    if not assigned.exists():
        return _json({'error': 'faculty not assigned to this subject/section'}, status=403)

    session_date = date.fromisoformat(date_str) if date_str else date.today()
    session = AttendanceSession.objects.create(subject=subject, faculty=faculty, date=session_date)
    created = 0
    for r in records:
        student_id = r.get('student_id')
        status = r.get('status')
        try:
            student = Student.objects.get(id=student_id)
            if student.semester != sem or (sec and student.section != sec) or student.department != subject.department:
                continue
            AttendanceRecord.objects.create(student=student, session=session, status=status)
            created += 1
        except Student.DoesNotExist:
            continue

    return _json({'status': 'ok', 'created': created})


def attendance_student(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    subjects = Subject.objects.filter(department=student.department, semester=student.semester)
    out = []
    for s in subjects:
        sessions = AttendanceSession.objects.filter(subject=s)
        total = sessions.count()
        if total == 0:
            perc = None
        else:
            attended = AttendanceRecord.objects.filter(student=student, session__subject=s, status='P').count()
            perc = int((attended / (total or 1)) * 100)
        out.append({'subject': s.name, 'subject_id': s.id, 'attendance_percent': perc})
    return _json({'student': student.user.username, 'attendance': out})


def attendance_report(request):
    depts = Department.objects.all()
    report = []
    for d in depts:
        students = Student.objects.filter(department=d)
        total_students = students.count()
        if total_students == 0:
            avg = None
        else:
            totals = 0
            counts = 0
            for st in students:
                sessions = AttendanceSession.objects.filter(subject__department=d)
                total_sessions = sessions.count()
                if total_sessions == 0:
                    continue
                present = AttendanceRecord.objects.filter(student=st, session__subject__department=d, status='P').count()
                totals += (present / total_sessions) * 100 if total_sessions else 0
                counts += 1
            avg = int(totals / (counts or 1)) if counts else None
        report.append({'department': d.name, 'students': total_students, 'average_attendance': avg})
    return _json(report)


@csrf_exempt
@require_auth(allowed=['ADMIN','HOD','FACULTY'])
def attendance_export(request):
    # exports attendance rows as CSV; filters: department, subject_id, start, end
    dept_code = request.GET.get('department')
    subject_id = request.GET.get('subject_id')
    start = request.GET.get('start')
    end = request.GET.get('end')

    qs = AttendanceRecord.objects.select_related('student__user', 'session__subject', 'session__faculty').all()
    if dept_code:
        qs = qs.filter(student__department__code__iexact=dept_code)
    if subject_id:
        qs = qs.filter(session__subject__id=int(subject_id))
    if start:
        try:
            from datetime import datetime as _dt
            sdt = _dt.fromisoformat(start)
            qs = qs.filter(session__date__gte=sdt.date())
        except Exception:
            return _json({'error': 'invalid start date'}, status=400)
    if end:
        try:
            from datetime import datetime as _dt
            edt = _dt.fromisoformat(end)
            qs = qs.filter(session__date__lte=edt.date())
        except Exception:
            return _json({'error': 'invalid end date'}, status=400)

    # permission: HOD may only export their department
    user = request.request_user
    if user.role == 'HOD':
        qs = qs.filter(student__department__hod=user)
    if user.role == 'FACULTY':
        qs = qs.filter(session__faculty__user=user)

    # stream CSV
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="attendance_export.csv"'
    writer = csv.writer(response)
    writer.writerow(['date', 'department', 'subject', 'faculty', 'student_usn', 'student_username', 'status'])
    for r in qs.order_by('session__date'):
        writer.writerow([
            r.session.date.isoformat(),
            r.student.department.code,
            r.session.subject.name,
            r.session.faculty.user.username,
            r.student.usn,
            r.student.user.username,
            r.status,
        ])
    return response


# Departments
@csrf_exempt
@require_auth(allowed=['ADMIN'])
def departments_list_create(request):
    if request.method == 'GET':
        qs = Department.objects.all()
        out = [{'id': d.id, 'name': d.name, 'code': d.code, 'hod': d.hod.username if d.hod else None} for d in qs]
        return _json(out)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        name = data.get('name')
        code = data.get('code')
        if not name or not code:
            return _json({'error': 'name and code required'}, status=400)
        dept = Department.objects.create(name=name, code=code)
        return _json({'id': dept.id, 'name': dept.name})

    return _json({'error': 'method not allowed'}, status=405)


@csrf_exempt
@require_auth(allowed=['ADMIN'])
def departments_detail(request, dept_id):
    dept = get_object_or_404(Department, id=dept_id)
    if request.method == 'GET':
        return _json({'id': dept.id, 'name': dept.name, 'code': dept.code, 'hod': dept.hod.username if dept.hod else None})

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        dept.name = data.get('name', dept.name)
        dept.code = data.get('code', dept.code)
        dept.save()
        return _json({'status': 'updated'})

    if request.method == 'DELETE':
        dept.delete()
        return _json({'status': 'deleted'})

    return _json({'error': 'method not allowed'}, status=405)


@csrf_exempt
@require_auth(allowed=['ADMIN'])
def assign_hod(request, dept_id):
    if request.method != 'POST':
        return _json({'error': 'method not allowed'}, status=405)
    dept = get_object_or_404(Department, id=dept_id)
    try:
        data = json.loads(request.body)
    except Exception:
        return _json({'error': 'invalid json'}, status=400)
    hod_user_id = data.get('hod_user_id')
    if not hod_user_id:
        return _json({'error': 'hod_user_id required'}, status=400)
    hod_user = get_object_or_404(User, id=hod_user_id)
    if hod_user.role != 'HOD':
        return _json({'error': 'user is not HOD'}, status=400)
    dept.hod = hod_user
    dept.save()
    return _json({'status': 'ok', 'hod': hod_user.username})


# FacultySubject assignments
@csrf_exempt
@require_auth(allowed=None)
def facultysubject_list_create(request):
    user = request.request_user
    # GET: return assignments scoped by role
    if request.method == 'GET':
        qs = FacultySubject.objects.select_related('faculty__user','subject').all()
        if user.role == 'FACULTY':
            qs = qs.filter(faculty__user__id=user.id)
        elif user.role == 'HOD':
            dept = Department.objects.filter(hod=user).first()
            if dept:
                qs = qs.filter(faculty__department=dept)
            else:
                qs = qs.none()
        # ADMIN sees all
        out = [{'id': fs.id, 'faculty': fs.faculty.user.username, 'faculty_id': fs.faculty.id, 'subject': fs.subject.name, 'subject_id': fs.subject.id, 'semester': fs.semester, 'section': fs.section} for fs in qs]
        return _json(out)

    # POST: create assignment (only ADMIN/HOD allowed)
    if request.method == 'POST':
        if user.role not in ['ADMIN','HOD']:
            return _json({'error': 'forbidden'}, status=403)
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        faculty_id = data.get('faculty_id')
        subject_id = data.get('subject_id')
        semester = data.get('semester')
        section = data.get('section')
        faculty = get_object_or_404(Faculty, id=faculty_id)
        subject = get_object_or_404(Subject, id=subject_id)
        # HOD may only assign within their department
        if user.role == 'HOD':
            dept = Department.objects.filter(hod=user).first()
            if not dept or faculty.department != dept or subject.department != dept:
                return _json({'error': 'forbidden'}, status=403)
        if faculty.department != subject.department:
            return _json({'error': 'faculty and subject department mismatch'}, status=400)
        fs = FacultySubject.objects.create(faculty=faculty, subject=subject, semester=semester or subject.semester, section=section or 'A')
        return _json({'id': fs.id, 'faculty': faculty.user.username, 'subject': subject.name})

    return _json({'error': 'method not allowed'}, status=405)


# Marks
@csrf_exempt
@require_auth(allowed=['FACULTY'])
def upload_marks(request):
    if request.method != 'POST':
        return _json({'error': 'method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
    except Exception:
        return _json({'error': 'invalid json'}, status=400)
    faculty = get_object_or_404(Faculty, user__id=request.request_user.id)
    subject_id = data.get('subject_id')
    student_id = data.get('student_id')
    marks_obtained = data.get('marks_obtained')
    max_marks = data.get('max_marks', 100)
    subject = get_object_or_404(Subject, id=subject_id)
    student = get_object_or_404(Student, id=student_id)
    assigned = FacultySubject.objects.filter(faculty=faculty, subject=subject, semester=student.semester, section=student.section).exists()
    if not assigned:
        return _json({'error': 'faculty not assigned to this subject/section'}, status=403)
    m = Marks.objects.create(student=student, subject=subject, faculty=faculty, marks_obtained=marks_obtained, max_marks=max_marks)
    return _json({'status': 'ok', 'id': m.id})


def marks_student(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    qs = Marks.objects.filter(student=student).select_related('subject','faculty__user')
    out = [{'subject': m.subject.name, 'faculty': m.faculty.user.username if m.faculty else None, 'marks': m.marks_obtained, 'max': m.max_marks, 'date': m.created_at.isoformat()} for m in qs]
    return _json({'student': student.user.username, 'marks': out})


# Stats
def stats_department(request, code):
    dept = get_object_or_404(Department, code=code)
    total_students = Student.objects.filter(department=dept).count()
    total_faculty = Faculty.objects.filter(department=dept).count()
    students = Student.objects.filter(department=dept)
    totals = 0
    counts = 0
    for st in students:
        sessions = AttendanceSession.objects.filter(subject__department=dept)
        total_sessions = sessions.count()
        if total_sessions == 0:
            continue
        present = AttendanceRecord.objects.filter(student=st, session__subject__department=dept, status='P').count()
        totals += (present / total_sessions) * 100 if total_sessions else 0
        counts += 1
    avg_attendance = int(totals / (counts or 1)) if counts else None
    return _json({'department': dept.name, 'students': total_students, 'faculty': total_faculty, 'average_attendance': avg_attendance})


def stats_overview(request):
    total_departments = Department.objects.count()
    total_students = Student.objects.count()
    total_faculty = Faculty.objects.count()
    depts = Department.objects.all()
    totals = 0
    counts = 0
    for d in depts:
        students = Student.objects.filter(department=d)
        for st in students:
            sessions = AttendanceSession.objects.filter(subject__department=d)
            total_sessions = sessions.count()
            if total_sessions == 0:
                continue
            present = AttendanceRecord.objects.filter(student=st, session__subject__department=d, status='P').count()
            totals += (present / total_sessions) * 100 if total_sessions else 0
            counts += 1
    avg_attendance = int(totals / (counts or 1)) if counts else None
    return _json({'departments': total_departments, 'students': total_students, 'faculty': total_faculty, 'average_attendance': avg_attendance})
