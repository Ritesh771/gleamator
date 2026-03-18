import json
from datetime import date

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.shortcuts import get_object_or_404
from django.db.models import Q

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
    # allow passing refresh in Authorization header as fallback
    if not token:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
    if not token:
        return _json({'error': 'refresh token required'}, status=400)
    # debug: show token preview and attempt to decode with exception logging
    try:
        print('token_refresh called; token_preview=', (token or '')[:60])
    except Exception:
        pass
    payload = decode_jwt(token)
    if not payload or payload.get('type') != 'refresh':
        try:
            import jwt as _jwt
            # attempt decode to capture exception
            _jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except Exception as e:
            print('token_refresh: jwt.decode error:', repr(e))
        print('token_refresh: invalid refresh token or wrong type; token_preview=', (token or '')[:60])
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
@require_auth(allowed=['ADMIN','HOD','FACULTY'])
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
        elif user.role == 'FACULTY':
            fac = Faculty.objects.filter(user=user).first()
            if not fac:
                return _json({'error': 'faculty profile not found'}, status=404)
            qs = Student.objects.select_related('user','department').filter(department=fac.department)
        else:
            qs = Student.objects.select_related('user','department').all()
        if search:
            qs = qs.filter(
                Q(user__username__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(usn__icontains=search)
            )
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
            'first_name': s.user.first_name,
            'last_name': s.user.last_name,
            'usn': s.usn,
            'email': s.user.email,
            'department': s.department.name if s.department else None,
            'semester': s.semester,
            'section': s.section,
        } for s in page_qs]
        return _json({'results': out, 'meta': meta})

    if request.method == 'POST':
        # only ADMIN or HOD may create students
        if request.request_user.role not in ['ADMIN','HOD']:
            return _json({'error': 'forbidden'}, status=403)
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
        user = User.objects.create(username=username, first_name=data.get('first_name',''), last_name=data.get('last_name',''), email=email or '', password=make_password(password), role='STUDENT')
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
            'first_name': student.user.first_name,
            'last_name': student.user.last_name,
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
            # allow updating user profile fields as well
            student.user.first_name = data.get('first_name', student.user.first_name)
            student.user.last_name = data.get('last_name', student.user.last_name)
            student.user.email = data.get('email', student.user.email)
            student.user.save()
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
            'first_name': f.user.first_name,
            'last_name': f.user.last_name,
            'email': f.user.email,
            'department': f.department.name if f.department else None,
            'department_id': f.department.id if f.department else None,
            'department_code': f.department.code if f.department else None,
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


# HODs list (returns hod user + department)
@csrf_exempt
@require_auth(allowed=['ADMIN'])
def hods_list_create(request):
    if request.method != 'GET':
        return _json({'error': 'method not allowed'}, status=405)
    search = request.GET.get('search')
    dept_filter = request.GET.get('department')
    # iterate departments that have hod assigned
    qs = Department.objects.select_related('hod').all()
    if dept_filter:
        qs = qs.filter(code__iexact=dept_filter)
    out_list = []
    for dept in qs:
        if not dept.hod:
            continue
        hod = dept.hod
        if search:
            if search.lower() not in (hod.username or '').lower() and search.lower() not in (hod.first_name or '').lower() and search.lower() not in (hod.last_name or '').lower():
                continue
        out_list.append({
            'id': hod.id,
            'username': hod.username,
            'first_name': hod.first_name,
            'last_name': hod.last_name,
            'email': hod.email,
            'department': dept.name,
            'department_id': dept.id,
            'department_code': dept.code,
        })
    # simple pagination mimic using paginate_queryset on list
    page_qs, meta = paginate_queryset(out_list, request)
    return _json({'results': page_qs, 'meta': meta})


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


@csrf_exempt
@require_auth(allowed=['ADMIN'])
def users_detail(request, user_id):
    user_obj = get_object_or_404(User, id=user_id)

    if request.method == 'GET':
        return _json({'id': user_obj.id, 'username': user_obj.username, 'first_name': user_obj.first_name, 'last_name': user_obj.last_name, 'email': user_obj.email, 'role': user_obj.role})

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        user_obj.first_name = data.get('first_name', user_obj.first_name)
        user_obj.last_name = data.get('last_name', user_obj.last_name)
        user_obj.email = data.get('email', user_obj.email)
        # allow role change
        if data.get('role'):
            user_obj.role = data.get('role')
        # allow password update (hash it)
        if data.get('password'):
            user_obj.password = make_password(data.get('password'))
        user_obj.save()
        return _json({'status': 'updated'})

    if request.method == 'DELETE':
        user_obj.delete()
        return _json({'status': 'deleted'})

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
        # handle department change if provided
        dept_id = data.get('department_id')
        if dept_id is not None:
            try:
                new_dept = Department.objects.get(id=int(dept_id))
            except Exception:
                return _json({'error': 'invalid department_id'}, status=400)
            # HOD may only operate within their department
            if user.role == 'HOD':
                hod_dept = Department.objects.filter(hod=user).first()
                if not hod_dept or new_dept != hod_dept:
                    return _json({'error': 'forbidden'}, status=403)
            faculty.department = new_dept

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
        # include faculty assignments (semester/section) for each subject
        subject_ids = [s.id for s in page_qs]
        fs_qs = FacultySubject.objects.filter(subject__in=subject_ids).select_related('faculty__user')
        assignments_by_subject = {}
        for fs in fs_qs:
            assignments_by_subject.setdefault(fs.subject_id, []).append({
                'id': fs.id,
                'faculty_id': fs.faculty.id,
                'faculty_username': fs.faculty.user.username if fs.faculty and fs.faculty.user else None,
                'semester': fs.semester,
                'section': fs.section,
            })

        out = [{
            'id': s.id,
            'name': s.name,
            'code': s.code,
            'department': s.department.name if s.department else None,
            'semester': s.semester,
            'credits': s.credits,
            'assignments': assignments_by_subject.get(s.id, [])
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


# Subject detail (GET, PUT, DELETE)
@csrf_exempt
def subjects_detail(request, subject_id):
    subject = get_object_or_404(Subject, id=subject_id)
    if request.method == 'GET':
        # include assignments
        fs_qs = FacultySubject.objects.filter(subject=subject).select_related('faculty__user')
        assignments = [{'id': fs.id, 'faculty_id': fs.faculty.id, 'faculty_username': fs.faculty.user.username if fs.faculty and fs.faculty.user else None, 'semester': fs.semester, 'section': fs.section} for fs in fs_qs]
        return _json({'id': subject.id, 'name': subject.name, 'code': subject.code, 'department': subject.department.name if subject.department else None, 'semester': subject.semester, 'credits': subject.credits, 'assignments': assignments})

    if request.method == 'PUT':
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
        semester = data.get('semester')
        credits = data.get('credits')
        if name:
            subject.name = name
        if code:
            subject.code = code
        if semester is not None:
            try:
                subject.semester = int(semester)
            except Exception:
                pass
        if credits is not None:
            try:
                subject.credits = int(credits)
            except Exception:
                pass
        subject.save()
        return _json({'status': 'ok', 'id': subject.id})

    if request.method == 'DELETE':
        # only admin/hod
        auth_header = request.META.get('HTTP_AUTHORIZATION','')
        if not auth_header.startswith('Bearer '):
            return _json({'error': 'authentication required'}, status=401)
        payload = decode_jwt(auth_header.split(' ',1)[1])
        if not payload or payload.get('role') not in ['ADMIN','HOD']:
            return _json({'error': 'forbidden'}, status=403)
        # delete subject and related faculty assignments
        FacultySubject.objects.filter(subject=subject).delete()
        subject.delete()
        return _json({'status': 'deleted'})

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
@require_auth(allowed=None)
def departments_list_create(request):
    # GET: allow ADMIN to list all departments; HOD sees only their department
    if request.method == 'GET':
        user = getattr(request, 'request_user', None)
        if user and user.role == 'ADMIN':
            qs = Department.objects.all()
            out = [{'id': d.id, 'name': d.name, 'code': d.code, 'hod': d.hod.username if d.hod else None} for d in qs]
            return _json(out)
        if user and user.role == 'HOD':
            dept = Department.objects.filter(hod=user).first()
            if not dept:
                return _json({'error': 'no department assigned'}, status=404)
            d = dept
            return _json([{'id': d.id, 'name': d.name, 'code': d.code, 'hod': d.hod.username if d.hod else None}])
        return _json({'error': 'forbidden'}, status=403)

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
@require_auth(allowed=None)
def departments_detail(request, dept_id):
    dept = get_object_or_404(Department, id=dept_id)
    user = getattr(request, 'request_user', None)
    if request.method == 'GET':
        # ADMIN can view any department; HOD can view only their own dept
        if user and user.role == 'ADMIN':
            return _json({'id': dept.id, 'name': dept.name, 'code': dept.code, 'hod': dept.hod.username if dept.hod else None})
        if user and user.role == 'HOD':
            if dept.hod and dept.hod.id == user.id:
                return _json({'id': dept.id, 'name': dept.name, 'code': dept.code, 'hod': dept.hod.username if dept.hod else None})
            return _json({'error': 'forbidden'}, status=403)
        return _json({'error': 'forbidden'}, status=403)

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
        out = [{'id': fs.id, 'faculty': fs.faculty.user.username, 'faculty_id': fs.faculty.id, 'subject': fs.subject.name, 'subject_id': fs.subject.id, 'semester': fs.semester, 'section': fs.section, 'department_code': fs.subject.department.code if fs.subject and fs.subject.department else None} for fs in qs]
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


@csrf_exempt
@require_auth(allowed=['ADMIN','HOD'])
def facultysubject_detail(request, fs_id):
    fs = get_object_or_404(FacultySubject, id=fs_id)
    user = request.request_user
    # HOD may only operate within their department
    if user.role == 'HOD':
        dept = Department.objects.filter(hod=user).first()
        if not dept or fs.faculty.department != dept or fs.subject.department != dept:
            return _json({'error': 'forbidden'}, status=403)

    if request.method == 'GET':
        return _json({'id': fs.id, 'faculty_id': fs.faculty.id, 'faculty': fs.faculty.user.username, 'subject_id': fs.subject.id, 'subject': fs.subject.name, 'semester': fs.semester, 'section': fs.section})

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
        except Exception:
            return _json({'error': 'invalid json'}, status=400)
        faculty_id = data.get('faculty_id')
        section = data.get('section')
        semester = data.get('semester')
        if faculty_id is not None:
            try:
                new_fac = Faculty.objects.get(id=int(faculty_id))
            except Exception:
                return _json({'error': 'invalid faculty_id'}, status=400)
            # ensure same department
            if new_fac.department != fs.subject.department:
                return _json({'error': 'faculty and subject department mismatch'}, status=400)
            fs.faculty = new_fac
        if section is not None:
            fs.section = section
        if semester is not None:
            try:
                fs.semester = int(semester)
            except Exception:
                pass
        fs.save()
        return _json({'status': 'updated'})

    if request.method == 'DELETE':
        fs.delete()
        return _json({'status': 'deleted'})

    return _json({'error': 'method not allowed'}, status=405)


@csrf_exempt
@require_auth(allowed=['FACULTY'])
def faculty_dashboard_stats(request):
    # Provide simple dashboard counts for faculty users
    user = request.request_user
    if request.method != 'GET':
        return _json({'error': 'method not allowed'}, status=405)
    try:
        faculty = Faculty.objects.get(user__id=user.id)
    except Faculty.DoesNotExist:
        return _json({'error': 'faculty profile not found'}, status=404)
    from datetime import date as _date
    today = _date.today()
    # number of attendance sessions created today for this faculty
    sessions_today = AttendanceSession.objects.filter(faculty=faculty, date=today).count()
    # number of assignments for this faculty
    assignments_count = FacultySubject.objects.filter(faculty=faculty).count()
    # pending attendance: assignments without a session today (approximation)
    pending = max(0, assignments_count - sessions_today)
    return _json({'classes_today': sessions_today, 'pending_attendance': pending, 'assignments_count': assignments_count})


@csrf_exempt
@require_auth(allowed=['FACULTY'])
def faculty_attendance_trends(request):
    """Return simple attendance percentage trends for the last 7 days for the logged-in faculty."""
    if request.method != 'GET':
        return _json({'error': 'method not allowed'}, status=405)
    try:
        faculty = Faculty.objects.get(user__id=request.request_user.id)
    except Faculty.DoesNotExist:
        return _json({'error': 'faculty profile not found'}, status=404)
    from datetime import date, timedelta
    today = date.today()
    trends = []
    # last 7 days (including today)
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        sessions = AttendanceSession.objects.filter(faculty=faculty, date=d)
        session_ids = [s.id for s in sessions]
        if not session_ids:
            trends.append({'label': d.isoformat(), 'value': 0})
            continue
        total = AttendanceRecord.objects.filter(session__in=session_ids).count()
        present = AttendanceRecord.objects.filter(session__in=session_ids, status='P').count()
        perc = int((present / (total or 1)) * 100) if total else 0
        trends.append({'label': d.isoformat(), 'value': perc})
    return _json({'trends': trends})


@csrf_exempt
@require_auth(allowed=['FACULTY'])
def attendance_records_list(request):
    """Return attendance sessions for the faculty with present/total counts. Optional filter: subject_id."""
    if request.method != 'GET':
        return _json({'error': 'method not allowed'}, status=405)
    try:
        faculty = Faculty.objects.get(user__id=request.request_user.id)
    except Faculty.DoesNotExist:
        return _json({'error': 'faculty profile not found'}, status=404)
    subject_id = request.GET.get('subject_id')
    qs = AttendanceSession.objects.filter(faculty=faculty).select_related('subject').order_by('-date')
    if subject_id:
        try:
            sid = int(subject_id)
            qs = qs.filter(subject__id=sid)
        except Exception:
            pass
    out = []
    for s in qs:
        total = AttendanceRecord.objects.filter(session=s).count()
        present = AttendanceRecord.objects.filter(session=s, status='P').count()
        out.append({'session_id': s.id, 'date': s.date.isoformat(), 'subject_id': s.subject.id if s.subject else None, 'subject': s.subject.name if s.subject else None, 'present': present, 'total': total})
    return _json({'results': out})


@csrf_exempt
@require_auth(allowed=['FACULTY','HOD','ADMIN'])
def attendance_session_students(request, session_id):
    """Return lists of present and absent students for a given attendance session."""
    if request.method != 'GET':
        return _json({'error': 'method not allowed'}, status=405)
    session = get_object_or_404(AttendanceSession, id=session_id)
    user = request.request_user
    # permission checks
    if user.role == 'FACULTY':
        if session.faculty.user.id != user.id:
            return _json({'error': 'forbidden'}, status=403)
    if user.role == 'HOD':
        # HOD may only view sessions for their department
        if not session.subject or session.subject.department.hod_id != user.id:
            return _json({'error': 'forbidden'}, status=403)

    qs = AttendanceRecord.objects.filter(session=session).select_related('student__user')
    present = []
    absent = []
    for r in qs:
        item = {
            'student_id': r.student.id,
            'usn': getattr(r.student, 'usn', None),
            'name': r.student.user.username if r.student and r.student.user else None,
            'section': getattr(r.student, 'section', None),
            'semester': getattr(r.student, 'semester', None),
        }
        if r.status == 'P':
            present.append(item)
        else:
            absent.append(item)

    return _json({'session_id': session_id, 'present': present, 'absent': absent})


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
    # upsert: if a mark for this student+subject exists, update it; otherwise create
    existing = Marks.objects.filter(student=student, subject=subject).order_by('-created_at').first()
    if existing:
        existing.marks_obtained = marks_obtained
        existing.max_marks = max_marks
        existing.faculty = faculty
        existing.save()
        return _json({'status': 'ok', 'id': existing.id, 'updated': True})
    else:
        m = Marks.objects.create(student=student, subject=subject, faculty=faculty, marks_obtained=marks_obtained, max_marks=max_marks)
        return _json({'status': 'ok', 'id': m.id, 'updated': False})


def marks_student(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    # return latest mark per subject for this student
    qs = Marks.objects.filter(student=student).select_related('subject','faculty__user').order_by('-created_at')
    latest = {}
    for m in qs:
        sid = m.subject.id
        if sid in latest:
            continue
        latest[sid] = m
    out = []
    for sid, m in latest.items():
        out.append({'subject_id': m.subject.id, 'subject': m.subject.name, 'faculty': m.faculty.user.username if m.faculty else None, 'marks': m.marks_obtained, 'max': m.max_marks, 'date': m.created_at.isoformat()})
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


@csrf_exempt
@require_auth(allowed=['ADMIN'])
def stats_admin(request):
    if request.method != 'GET':
        return _json({'error': 'method not allowed'}, status=405)
    total_users = User.objects.count()
    admins = User.objects.filter(role='ADMIN').count()
    faculty = Faculty.objects.count()
    students = Student.objects.count()
    departments = Department.objects.count()
    return _json({'total_users': total_users, 'admins': admins, 'faculty': faculty, 'students': students, 'departments': departments})
