from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from datetime import timedelta, date
import random

from student.models import (
    User, Department, Faculty, Student, Subject,
    FacultySubject, AttendanceSession, AttendanceRecord, Marks
)


FIRST_NAMES = [
    'Aarav','Vihaan','Arjun','Aditya','Ishaan','Saanvi','Ananya','Priya','Kavya','Riya'
]
LAST_NAMES = ['Sharma','Patel','Reddy','Kumar','Singh','Gupta','Iyer','Nair','Chowdhury','Das']


def rand_name():
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


class Command(BaseCommand):
    help = 'Seed the database with sample departments, users, subjects, marks and attendance.'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Remove existing seeded data first')

    def handle(self, *args, **options):
        if options.get('force'):
            self.stdout.write('Clearing existing seedable data (students, faculty, subjects, marks, attendance)...')
            Marks.objects.all().delete()
            AttendanceRecord.objects.all().delete()
            AttendanceSession.objects.all().delete()
            FacultySubject.objects.all().delete()
            Subject.objects.all().delete()
            Student.objects.all().delete()
            Faculty.objects.all().delete()
            Department.objects.all().delete()
            # do not delete users globally to avoid removing superusers; we'll delete created users with known prefix

        self.stdout.write('Creating principal (ADMIN)...')
        admin_user, _ = User.objects.get_or_create(
            username='principal',
            defaults={
                'first_name': 'Principal',
                'last_name': 'User',
                'email': 'principal@example.local',
                'role': 'ADMIN',
                'password': make_password('12345')
            }
        )

        # Departments with uneven sizes as requested
        departments = [
            {'name': 'Computer Science and Engineering', 'code': 'CSE', 'students': 5, 'faculty': 5},
            {'name': 'Electronics and Communication', 'code': 'EC', 'students': 3, 'faculty': 3},
            {'name': 'Artificial Intelligence', 'code': 'AI', 'students': 9, 'faculty': 9},
        ]

        created_counts = {
            'departments': 0, 'hods': 0, 'faculty': 0, 'students': 0,
            'subjects': 0, 'faculty_subjects': 0, 'attendance_sessions': 0, 'attendance_records': 0, 'marks': 0
        }

        for dept_cfg in departments:
            dept, _ = Department.objects.get_or_create(name=dept_cfg['name'], code=dept_cfg['code'])
            created_counts['departments'] += 1

            # create HOD user
            fn, ln = rand_name()
            hod_username = f"{dept.code.lower()}_hod"
            hod_user, _ = User.objects.get_or_create(username=hod_username, defaults={
                'first_name': fn, 'last_name': ln, 'email': f'{hod_username}@example.local', 'role': 'HOD', 'password': make_password('12345')
            })
            dept.hod = hod_user
            dept.save()
            created_counts['hods'] += 1

            # create faculty
            faculty_list = []
            for i in range(dept_cfg['faculty']):
                fn, ln = rand_name()
                uname = f"{dept.code.lower()}_fac{i+1}"
                email = f"{uname}@example.local"
                u, created = User.objects.get_or_create(username=uname, defaults={'first_name': fn, 'last_name': ln, 'email': email, 'role': 'FACULTY', 'password': make_password('12345')})
                if created:
                    created_counts['faculty'] += 1
                fac = Faculty.objects.create(user=u, department=dept, designation='Lecturer', phone=f'9000000{random.randint(100,999)}', joining_date=date.today() - timedelta(days=random.randint(30,2000)))
                faculty_list.append(fac)

            # create students
            student_list = []
            for i in range(dept_cfg['students']):
                fn, ln = rand_name()
                uname = f"{dept.code.lower()}_stu{i+1}"
                email = f"{uname}@example.local"
                u, created = User.objects.get_or_create(username=uname, defaults={'first_name': fn, 'last_name': ln, 'email': email, 'role': 'STUDENT', 'password': make_password('12345')})
                if created:
                    created_counts['students'] += 1
                usn = f"USN{dept.code}{i+1:03d}"
                section = random.choice(['A','B'])
                stu = Student.objects.create(user=u, usn=usn, department=dept, semester=random.randint(1,4), section=section, phone=f'8000000{random.randint(100,999)}', address='Sample address', admission_date=date.today() - timedelta(days=random.randint(100,2000)))
                student_list.append(stu)

            # create subjects for department (4 subjects)
            subjects = []
            subj_templates = ['Intro to', 'Advanced', 'Fundamentals of', 'Principles of']
            for si in range(4):
                name = f"{random.choice(subj_templates)} {dept.code} {si+1}"
                code = f"{dept.code}{100+si}"
                semester = random.randint(1,4)
                subj, _ = Subject.objects.get_or_create(name=name, code=code, defaults={'department': dept, 'semester': semester, 'credits': random.choice([3,4])})
                subjects.append(subj)
                created_counts['subjects'] += 1

            # assign subjects to faculty (round-robin) and sections
            fs_count = 0
            for idx, subj in enumerate(subjects):
                # choose a faculty (round robin)
                if faculty_list:
                    fac = faculty_list[idx % len(faculty_list)]
                    sem = subj.semester
                    section = random.choice(['A','B'])
                    FacultySubject.objects.create(faculty=fac, subject=subj, semester=sem, section=section)
                    fs_count += 1
            created_counts['faculty_subjects'] += fs_count

            # create attendance sessions and records (uneven)
            sess_count = 0
            rec_count = 0
            for subj in subjects:
                num_sessions = random.randint(1,6)
                for s in range(num_sessions):
                    # pick a faculty who teaches this subject where possible
                    fac_objs = FacultySubject.objects.filter(subject=subj)
                    if fac_objs.exists():
                        fac = fac_objs.order_by('?').first().faculty
                    else:
                        fac = random.choice(faculty_list) if faculty_list else None
                    session_date = date.today() - timedelta(days=random.randint(1,120))
                    if not fac:
                        continue
                    sess = AttendanceSession.objects.create(subject=subj, faculty=fac, date=session_date)
                    sess_count += 1
                    # create records for students in this department; vary presence
                    for stu in student_list:
                        status = 'P' if random.random() < 0.7 else 'A'
                        AttendanceRecord.objects.create(student=stu, session=sess, status=status)
                        rec_count += 1

            created_counts['attendance_sessions'] += sess_count
            created_counts['attendance_records'] += rec_count

            # create marks (uneven, multiple entries possible)
            marks_created = 0
            for stu in student_list:
                for subj in subjects:
                    # randomly skip some subjects for some students to make uneven data
                    if random.random() < 0.3:
                        continue
                    num_entries = random.randint(1,3)  # multiple entries to create history
                    for e in range(num_entries):
                        obtained = round(random.uniform(30, 100), 1)
                        maxm = random.choice([50, 75, 100])
                        # pick a faculty for subject if exists
                        fac_objs = FacultySubject.objects.filter(subject=subj)
                        fac = fac_objs.order_by('?').first().faculty if fac_objs.exists() else (random.choice(faculty_list) if faculty_list else None)
                        m = Marks.objects.create(student=stu, subject=subj, faculty=fac, marks_obtained=obtained, max_marks=maxm)
                        # backdate created_at randomly
                        m.created_at = timezone.now() - timedelta(days=random.randint(1,200))
                        m.save(update_fields=['created_at'])
                        marks_created += 1

            created_counts['marks'] += marks_created

        # summary
        self.stdout.write(self.style.SUCCESS('Seeding complete. Summary:'))
        for k, v in created_counts.items():
            self.stdout.write(f'  {k}: {v}')

        self.stdout.write(self.style.SUCCESS('All done. Users created with password `12345`.'))
