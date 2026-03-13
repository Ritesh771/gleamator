from django.db import models


from django.db import models
from django.contrib.auth.models import AbstractUser




class User(AbstractUser):

    ROLE_CHOICES = (
        ('ADMIN', 'Principal/Admin'),
        ('HOD', 'HOD'),
        ('FACULTY', 'Faculty'),
        ('STUDENT', 'Student'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.username} - {self.role}"




class Department(models.Model):

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)

    hod = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'HOD'}
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Faculty(models.Model):

    user = models.OneToOneField(User, on_delete=models.CASCADE)

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE
    )

    designation = models.CharField(max_length=100)

    phone = models.CharField(max_length=15)

    joining_date = models.DateField()

    def __str__(self):
        return self.user.username




class Student(models.Model):

    user = models.OneToOneField(User, on_delete=models.CASCADE)

    usn = models.CharField(max_length=20, unique=True)

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE
    )

    semester = models.IntegerField()

    section = models.CharField(max_length=5)

    phone = models.CharField(max_length=15)

    address = models.TextField()

    admission_date = models.DateField()

    def __str__(self):
        return f"{self.user.username} - {self.usn}"



class Subject(models.Model):

    name = models.CharField(max_length=100)

    code = models.CharField(max_length=10, unique=True)

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE
    )

    semester = models.IntegerField()

    credits = models.IntegerField()

    def __str__(self):
        return f"{self.name} ({self.code})"




class FacultySubject(models.Model):

    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE
    )

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE
    )

    semester = models.IntegerField()

    section = models.CharField(max_length=5)

    def __str__(self):
        return f"{self.faculty} - {self.subject}"




class AttendanceSession(models.Model):

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE
    )

    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE
    )

    date = models.DateField()

    def __str__(self):
        return f"{self.subject} - {self.date}"




class AttendanceRecord(models.Model):

    STATUS_CHOICES = (
        ('P', 'Present'),
        ('A', 'Absent'),
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE
    )

    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE
    )

    status = models.CharField(max_length=1, choices=STATUS_CHOICES)

    def __str__(self):
        return f"{self.student} - {self.status}"


class Marks(models.Model):
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE
    )

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE
    )

    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    marks_obtained = models.FloatField()
    max_marks = models.FloatField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} - {self.subject} : {self.marks_obtained}/{self.max_marks}"


class RefreshToken(models.Model):
    """Persist refresh tokens for rotation and revocation."""
    jti = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)

    def __str__(self):
        return f"RefreshToken {self.jti} for {self.user.username}"