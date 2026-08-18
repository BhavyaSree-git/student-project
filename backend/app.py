import json
import os
from datetime import datetime
from functools import wraps
from urllib.parse import quote_plus

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from openai import APIConnectionError, APIError, AuthenticationError, OpenAI, RateLimitError
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'student-management-secret-key')
CORS(app, supports_credentials=True)


def build_db_url():
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        return db_url

    db_user = os.environ.get('DATABASE_USER') or os.environ.get('POSTGRES_USER')
    db_pass = os.environ.get('DATABASE_PASSWORD') or os.environ.get('POSTGRES_PASSWORD')
    db_name = os.environ.get('DATABASE_NAME') or os.environ.get('POSTGRES_DB')
    db_host = os.environ.get('DATABASE_HOST', 'localhost')
    db_port = os.environ.get('DATABASE_PORT', '5432')

    if db_user and db_pass and db_name:
        user = quote_plus(db_user)
        password = quote_plus(db_pass)
        return f'postgresql://{user}:{password}@{db_host}:{db_port}/{db_name}'

    return 'sqlite:///students.db'


app.config['SQLALCHEMY_DATABASE_URI'] = build_db_url()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


class Admin(db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'created_at': self.created_at.isoformat()}


class College(db.Model):
    __tablename__ = 'colleges'
    id = db.Column(db.Integer, primary_key=True)
    college_name = db.Column(db.String(150), nullable=False)
    university_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    pincode = db.Column(db.String(30), nullable=False)
    website = db.Column(db.String(150), nullable=True)
    college_type = db.Column(db.String(50), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    approval_status = db.Column(db.String(30), default='PENDING', nullable=False)
    rejection_reason = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=False, nullable=False)
    deactivation_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    teachers = db.relationship('Teacher', back_populates='college', cascade='all, delete-orphan')
    students = db.relationship('Student', back_populates='college', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'college_name': self.college_name,
            'university_name': self.university_name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'pincode': self.pincode,
            'website': self.website,
            'college_type': self.college_type,
            'approval_status': self.approval_status,
            'rejection_reason': self.rejection_reason,
            'is_active': self.is_active,
            'deactivation_reason': self.deactivation_reason,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class Teacher(db.Model):
    __tablename__ = 'teachers'
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    department = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(120), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    college = db.relationship('College', back_populates='teachers')
    students = db.relationship('Student', back_populates='teacher', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'college_id': self.college_id,
            'name': self.name,
            'email': self.email,
            'department': self.department,
            'subject': self.subject,
            'is_active': self.is_active,
            'college_name': self.college.college_name if self.college else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    student_id = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    date_of_birth = db.Column(db.String(30), nullable=False)
    gender = db.Column(db.String(30), nullable=False)
    department = db.Column(db.String(120), nullable=False)
    course = db.Column(db.String(120), nullable=False)
    year = db.Column(db.String(60), nullable=False)
    section = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    college = db.relationship('College', back_populates='students')
    teacher = db.relationship('Teacher', back_populates='students')
    marks = db.relationship('Marks', back_populates='student', cascade='all, delete-orphan')
    attendance = db.relationship('Attendance', back_populates='student', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'college_id': self.college_id,
            'teacher_id': self.teacher_id,
            'student_id': self.student_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'date_of_birth': self.date_of_birth,
            'gender': self.gender,
            'department': self.department,
            'course': self.course,
            'year': self.year,
            'section': self.section,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class Marks(db.Model):
    __tablename__ = 'marks'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject = db.Column(db.String(120), nullable=False)
    marks = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = db.relationship('Student', back_populates='marks')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject': self.subject,
            'marks': self.marks,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class Attendance(db.Model):
    __tablename__ = 'attendance'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, unique=True)
    total_classes = db.Column(db.Integer, default=0, nullable=False)
    present = db.Column(db.Integer, default=0, nullable=False)
    absent = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = db.relationship('Student', back_populates='attendance')

    def to_dict(self):
        if self.total_classes > 0:
            attendance_percentage = round((self.present / self.total_classes) * 100, 2)
        else:
            attendance_percentage = 0
        return {
            'id': self.id,
            'student_id': self.student_id,
            'total_classes': self.total_classes,
            'present': self.present,
            'absent': self.absent,
            'attendance_percentage': attendance_percentage,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')


with app.app_context():
    db.create_all()

    admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    if not Admin.query.filter_by(username=admin_username).first():
        db.session.add(Admin(username=admin_username, password_hash=generate_password_hash(admin_password)))
        db.session.commit()


def current_user():
    user = session.get('user')
    if not user:
        return None

    role = user.get('role')
    if role == 'admin':
        return Admin.query.get(user.get('id'))
    if role == 'college':
        return College.query.get(user.get('id'))
    if role == 'teacher':
        return Teacher.query.get(user.get('id'))
    return None


def require_role(role):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if user is None:
                return jsonify({'error': 'Unauthorized. Please log in again.'}), 401

            if role == 'admin' and not isinstance(user, Admin):
                return jsonify({'error': 'Admin access required.'}), 403
            if role == 'college' and not isinstance(user, College):
                return jsonify({'error': 'College access required.'}), 403
            if role == 'teacher' and not isinstance(user, Teacher):
                return jsonify({'error': 'Teacher access required.'}), 403

            if role == 'college':
                if user.approval_status != 'APPROVED':
                    return jsonify({'error': 'Your registration is waiting for Admin approval.'}), 403
                if not user.is_active:
                    return jsonify({'error': 'Your college account is currently inactive.'}), 403

            if role == 'teacher':
                if not user.is_active:
                    return jsonify({'error': 'Your teacher account is inactive.'}), 403
                if not user.college or user.college.approval_status != 'APPROVED':
                    return jsonify({'error': 'Your college is not approved yet.'}), 403
                if not user.college.is_active:
                    return jsonify({'error': 'Your college account is currently inactive.'}), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/api/auth/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', ''))

    admin = Admin.query.filter_by(username=username).first()
    admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')

    if not admin:
        if username == admin_username and password == admin_password:
            admin = Admin.query.filter_by(username=admin_username).first()
        else:
            return jsonify({'error': 'Invalid admin credentials.'}), 401

    if not check_password_hash(admin.password_hash, password):
        if not (username == admin_username and password == admin_password):
            return jsonify({'error': 'Invalid admin credentials.'}), 401

    session['user'] = {'role': 'admin', 'id': admin.id}
    return jsonify({'message': 'Admin login successful.', 'user': admin.to_dict()})


@app.route('/api/auth/college/register', methods=['POST'])
def college_register():
    data = request.get_json(silent=True) or {}
    required_fields = [
        'college_name', 'university_name', 'email', 'phone', 'address', 'city',
        'state', 'country', 'pincode', 'college_type', 'password', 'confirm_password'
    ]
    missing = [field for field in required_fields if not str(data.get(field, '')).strip()]
    if missing:
        return jsonify({'error': 'Missing fields: ' + ', '.join(missing)}), 400

    if data['password'] != data['confirm_password']:
        return jsonify({'error': 'Password and confirm password do not match.'}), 400

    email = str(data['email']).strip().lower()
    if College.query.filter_by(email=email).first():
        return jsonify({'error': 'A college with this email already exists.'}), 409

    college = College(
        college_name=str(data['college_name']).strip(),
        university_name=str(data['university_name']).strip(),
        email=email,
        phone=str(data['phone']).strip(),
        address=str(data['address']).strip(),
        city=str(data['city']).strip(),
        state=str(data['state']).strip(),
        country=str(data['country']).strip(),
        pincode=str(data['pincode']).strip(),
        website=str(data.get('website', '')).strip() or None,
        college_type=str(data['college_type']).strip(),
        password_hash=generate_password_hash(data['password']),
        approval_status='PENDING',
        is_active=False,
    )
    db.session.add(college)
    db.session.commit()
    return jsonify({'message': 'College registration submitted for approval.', 'college': college.to_dict()}), 201


@app.route('/api/auth/college/login', methods=['POST'])
def college_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))

    college = College.query.filter_by(email=email).first()
    if not college or not check_password_hash(college.password_hash, password):
        return jsonify({'error': 'Invalid college credentials.'}), 401

    if college.approval_status == 'PENDING':
        return jsonify({'error': 'Your registration is waiting for Admin approval.'}), 403
    if college.approval_status == 'REJECTED':
        return jsonify({'error': 'Your college registration was rejected.', 'reason': college.rejection_reason}), 403
    if not college.is_active:
        return jsonify({'error': 'Your college account is currently inactive.', 'reason': college.deactivation_reason}), 403

    session['user'] = {'role': 'college', 'id': college.id}
    return jsonify({'message': 'College login successful.', 'college': college.to_dict()})


@app.route('/api/auth/teacher/login', methods=['POST'])
def teacher_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))

    teacher = Teacher.query.filter_by(email=email).first()
    if not teacher or not check_password_hash(teacher.password_hash, password):
        return jsonify({'error': 'Invalid teacher credentials.'}), 401

    if not teacher.is_active:
        return jsonify({'error': 'Teacher account is inactive.'}), 403
    if not teacher.college or teacher.college.approval_status != 'APPROVED':
        return jsonify({'error': 'Your college is not approved.'}), 403
    if not teacher.college.is_active:
        return jsonify({'error': 'Your college account is currently inactive.'}), 403

    session['user'] = {'role': 'teacher', 'id': teacher.id}
    return jsonify({'message': 'Teacher login successful.', 'teacher': teacher.to_dict()})


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully.'})


@app.route('/api/admin/colleges', methods=['GET'])
@require_role('admin')
def admin_colleges():
    colleges = College.query.order_by(College.created_at.desc()).all()
    result = []
    for college in colleges:
        teacher_count = Teacher.query.filter_by(college_id=college.id).count()
        student_count = Student.query.filter_by(college_id=college.id).count()
        result.append({
            **college.to_dict(),
            'teacher_count': teacher_count,
            'student_count': student_count,
        })
    return jsonify(result)


@app.route('/api/admin/dashboard', methods=['GET'])
@require_role('admin')
def admin_dashboard():
    stats = {
        'total_colleges': College.query.count(),
        'pending_colleges': College.query.filter_by(approval_status='PENDING').count(),
        'approved_colleges': College.query.filter_by(approval_status='APPROVED').count(),
        'rejected_colleges': College.query.filter_by(approval_status='REJECTED').count(),
        'active_colleges': College.query.filter_by(is_active=True).count(),
        'inactive_colleges': College.query.filter_by(is_active=False).count(),
        'total_teachers': Teacher.query.count(),
        'total_students': Student.query.count(),
    }
    return jsonify(stats)


@app.route('/api/admin/colleges/<int:college_id>/approve', methods=['POST'])
@require_role('admin')
def approve_college(college_id):
    college = College.query.get_or_404(college_id)
    college.approval_status = 'APPROVED'
    college.is_active = True
    college.rejection_reason = None
    college.deactivation_reason = None
    college.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'College approved successfully.', 'college': college.to_dict()})


@app.route('/api/admin/colleges/<int:college_id>/reject', methods=['POST'])
@require_role('admin')
def reject_college(college_id):
    college = College.query.get_or_404(college_id)
    data = request.get_json(silent=True) or {}
    reason = str(data.get('reason', '')).strip() or 'No reason provided.'
    college.approval_status = 'REJECTED'
    college.is_active = False
    college.rejection_reason = reason
    college.deactivation_reason = None
    college.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'College rejected successfully.', 'college': college.to_dict()})


@app.route('/api/admin/colleges/<int:college_id>/activate', methods=['POST'])
@require_role('admin')
def activate_college(college_id):
    college = College.query.get_or_404(college_id)
    if college.approval_status != 'APPROVED':
        return jsonify({'error': 'Only approved colleges can be activated.'}), 400
    college.is_active = True
    college.deactivation_reason = None
    college.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'College activated successfully.', 'college': college.to_dict()})


@app.route('/api/admin/colleges/<int:college_id>/deactivate', methods=['POST'])
@require_role('admin')
def deactivate_college(college_id):
    college = College.query.get_or_404(college_id)
    data = request.get_json(silent=True) or {}
    reason = str(data.get('reason', '')).strip() or 'No reason provided.'
    college.is_active = False
    college.deactivation_reason = reason
    college.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'College deactivated successfully.', 'college': college.to_dict()})


@app.route('/api/college/profile', methods=['GET'])
@require_role('college')
def college_profile():
    college = current_user()
    return jsonify({
        **college.to_dict(),
        'total_teachers': Teacher.query.filter_by(college_id=college.id).count(),
        'total_students': Student.query.filter_by(college_id=college.id).count(),
    })


@app.route('/api/college/teachers', methods=['GET'])
@require_role('college')
def college_teachers():
    teacher_list = Teacher.query.filter_by(college_id=current_user().id).order_by(Teacher.created_at.desc()).all()
    return jsonify([teacher.to_dict() for teacher in teacher_list])


@app.route('/api/college/teachers', methods=['POST'])
@require_role('college')
def create_teacher_for_college():
    college = current_user()
    data = request.get_json(silent=True) or {}
    required_fields = ['name', 'email', 'password', 'confirm_password', 'department', 'subject']
    missing = [field for field in required_fields if not str(data.get(field, '')).strip()]
    if missing:
        return jsonify({'error': 'Missing fields: ' + ', '.join(missing)}), 400
    if data['password'] != data['confirm_password']:
        return jsonify({'error': 'Password and confirm password do not match.'}), 400

    email = str(data['email']).strip().lower()
    if Teacher.query.filter_by(email=email).first():
        return jsonify({'error': 'A teacher with this email already exists.'}), 409

    teacher = Teacher(
        college_id=college.id,
        name=str(data['name']).strip(),
        email=email,
        password_hash=generate_password_hash(data['password']),
        department=str(data['department']).strip(),
        subject=str(data['subject']).strip(),
        is_active=True,
    )
    db.session.add(teacher)
    db.session.commit()
    return jsonify({'message': 'Teacher created successfully.', 'teacher': teacher.to_dict()}), 201


@app.route('/api/teacher/profile', methods=['GET'])
@require_role('teacher')
def teacher_profile():
    teacher = current_user()
    return jsonify({
        'id': teacher.id,
        'name': teacher.name,
        'email': teacher.email,
        'department': teacher.department,
        'subject': teacher.subject,
        'college_name': teacher.college.college_name,
        'is_active': teacher.is_active,
    })


@app.route('/api/teacher/dashboard', methods=['GET'])
@require_role('teacher')
def teacher_dashboard():
    teacher = current_user()
    students = Student.query.filter_by(teacher_id=teacher.id).all()
    average_marks = 0
    average_attendance = 0

    if students:
        student_mark_values = []
        student_attendance_values = []
        for student in students:
            mark_values = [mark.marks for mark in student.marks]
            if mark_values:
                student_mark_values.append(round(sum(mark_values) / len(mark_values), 2))
            attendance = student.attendance
            if attendance and attendance.total_classes > 0:
                student_attendance_values.append(round((attendance.present / attendance.total_classes) * 100, 2))

        if student_mark_values:
            average_marks = round(sum(student_mark_values) / len(student_mark_values), 2)
        if student_attendance_values:
            average_attendance = round(sum(student_attendance_values) / len(student_attendance_values), 2)

    return jsonify({
        'teacher_name': teacher.name,
        'college_name': teacher.college.college_name,
        'department': teacher.department,
        'subject': teacher.subject,
        'total_students': len(students),
        'average_marks': average_marks,
        'average_attendance': average_attendance,
    })


@app.route('/api/teacher/students', methods=['GET'])
@require_role('teacher')
def teacher_students():
    students = Student.query.filter_by(teacher_id=current_user().id).order_by(Student.created_at.desc()).all()
    return jsonify([student.to_dict() for student in students])


@app.route('/api/students', methods=['POST'])
@require_role('teacher')
def create_student_route():
    teacher = current_user()
    data = request.get_json(silent=True) or {}
    required_fields = ['student_id', 'name', 'email', 'phone', 'date_of_birth', 'gender', 'department', 'course', 'year', 'section']
    missing = [field for field in required_fields if not str(data.get(field, '')).strip()]
    if missing:
        return jsonify({'error': 'Missing fields: ' + ', '.join(missing)}), 400

    student = Student(
        college_id=teacher.college_id,
        teacher_id=teacher.id,
        student_id=str(data['student_id']).strip(),
        name=str(data['name']).strip(),
        email=str(data['email']).strip().lower(),
        phone=str(data['phone']).strip(),
        date_of_birth=str(data['date_of_birth']).strip(),
        gender=str(data['gender']).strip(),
        department=str(data['department']).strip(),
        course=str(data['course']).strip(),
        year=str(data['year']).strip(),
        section=str(data['section']).strip(),
    )
    db.session.add(student)
    db.session.commit()
    return jsonify({'message': 'Student added successfully.', 'student': student.to_dict()}), 201


@app.route('/api/students/<int:student_id>', methods=['GET'])
@require_role('teacher')
def get_student_details(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'You are not authorized to view this student.'}), 403
    payload = student.to_dict()
    payload['marks'] = [mark.to_dict() for mark in student.marks]
    payload['attendance'] = student.attendance.to_dict() if student.attendance else {'student_id': student.id, 'total_classes': 0, 'present': 0, 'absent': 0, 'attendance_percentage': 0}
    return jsonify(payload)


@app.route('/api/students/<int:student_id>', methods=['PUT'])
@require_role('teacher')
def update_student_route(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'You are not authorized to update this student.'}), 403

    data = request.get_json(silent=True) or {}
    for field in ['student_id', 'name', 'email', 'phone', 'date_of_birth', 'gender', 'department', 'course', 'year', 'section']:
        if field in data and str(data[field]).strip():
            setattr(student, field, str(data[field]).strip())
    student.email = student.email.lower()
    db.session.commit()
    return jsonify({'message': 'Student updated successfully.', 'student': student.to_dict()})


@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@require_role('teacher')
def delete_student_route(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'You are not authorized to delete this student.'}), 403
    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student deleted successfully.'})


@app.route('/api/marks', methods=['GET'])
@require_role('teacher')
def get_marks():
    teacher = current_user()
    student_ids = [student.id for student in Student.query.filter_by(teacher_id=teacher.id).all()]
    if not student_ids:
        return jsonify([])
    marks = Marks.query.filter(Marks.student_id.in_(student_ids)).order_by(Marks.created_at.desc()).all()
    return jsonify([mark.to_dict() for mark in marks])


@app.route('/api/marks', methods=['POST'])
@require_role('teacher')
def create_mark():
    teacher = current_user()
    data = request.get_json(silent=True) or {}
    student_id = data.get('student_id')
    subject = str(data.get('subject', '')).strip()
    marks_value = data.get('marks')

    if not student_id or not subject or marks_value is None:
        return jsonify({'error': 'student_id, subject and marks are required.'}), 400

    student = Student.query.get(student_id)
    if not student or student.teacher_id != teacher.id:
        return jsonify({'error': 'Student not found or not assigned to your class.'}), 403

    try:
        marks_value = float(marks_value)
    except (TypeError, ValueError):
        return jsonify({'error': 'Marks must be numeric.'}), 400

    mark_record = Marks.query.filter_by(student_id=student.id, subject=subject).first()
    if mark_record:
        mark_record.marks = marks_value
        mark_record.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Marks updated successfully.', 'marks': mark_record.to_dict()})

    record = Marks(student_id=student.id, subject=subject, marks=marks_value)
    db.session.add(record)
    db.session.commit()
    return jsonify({'message': 'Marks added successfully.', 'marks': record.to_dict()}), 201


@app.route('/api/marks/<int:mark_id>', methods=['PUT'])
@require_role('teacher')
def update_mark(mark_id):
    mark = Marks.query.get_or_404(mark_id)
    teacher = current_user()
    if mark.student.teacher_id != teacher.id:
        return jsonify({'error': 'You are not authorized to update these marks.'}), 403

    data = request.get_json(silent=True) or {}
    if 'subject' in data and str(data['subject']).strip():
        mark.subject = str(data['subject']).strip()
    if 'marks' in data and data['marks'] is not None:
        try:
            mark.marks = float(data['marks'])
        except (TypeError, ValueError):
            return jsonify({'error': 'Marks must be numeric.'}), 400
    db.session.commit()
    return jsonify({'message': 'Marks updated successfully.', 'marks': mark.to_dict()})


@app.route('/api/attendance', methods=['GET'])
@require_role('teacher')
def get_attendance_records():
    teacher = current_user()
    student_ids = [student.id for student in Student.query.filter_by(teacher_id=teacher.id).all()]
    if not student_ids:
        return jsonify([])
    records = Attendance.query.filter(Attendance.student_id.in_(student_ids)).order_by(Attendance.created_at.desc()).all()
    return jsonify([record.to_dict() for record in records])


@app.route('/api/attendance', methods=['POST'])
def create_attendance_record():
    teacher = current_user()
    data = request.get_json(silent=True) or {}
    student_id = data.get('student_id')
    total_classes = data.get('total_classes')
    present = data.get('present')

    if student_id is None or total_classes is None or present is None:
        return jsonify({'error': 'student_id, total_classes and present are required.'}), 400

    student = Student.query.get(student_id)
    if not student or student.teacher_id != teacher.id:
        return jsonify({'error': 'Student not found or not assigned to your class.'}), 403

    try:
        total_classes = int(total_classes)
        present = int(present)
    except (TypeError, ValueError):
        return jsonify({'error': 'Attendance values must be numbers.'}), 400

    if total_classes < 0 or present < 0 or present > total_classes:
        return jsonify({'error': 'Invalid attendance values.'}), 400

    absent = total_classes - present
    if student.attendance:
        student.attendance.total_classes = total_classes
        student.attendance.present = present
        student.attendance.absent = absent
        student.attendance.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Attendance updated successfully.', 'attendance': student.attendance.to_dict()})

    record = Attendance(student_id=student.id, total_classes=total_classes, present=present, absent=absent)
    db.session.add(record)
    db.session.commit()
    return jsonify({'message': 'Attendance added successfully.', 'attendance': record.to_dict()}), 201


@app.route('/api/attendance/<int:attendance_id>', methods=['PUT'])
@require_role('teacher')
def update_attendance_record(attendance_id):
    record = Attendance.query.get_or_404(attendance_id)
    teacher = current_user()
    if record.student.teacher_id != teacher.id:
        return jsonify({'error': 'You are not authorized to update this attendance record.'}), 403

    data = request.get_json(silent=True) or {}
    total_classes = data.get('total_classes', record.total_classes)
    present = data.get('present', record.present)

    try:
        total_classes = int(total_classes)
        present = int(present)
    except (TypeError, ValueError):
        return jsonify({'error': 'Attendance values must be numbers.'}), 400

    if total_classes < 0 or present < 0 or present > total_classes:
        return jsonify({'error': 'Invalid attendance values.'}), 400

    record.total_classes = total_classes
    record.present = present
    record.absent = total_classes - present
    record.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Attendance updated successfully.', 'attendance': record.to_dict()})


@app.route('/api/ai/summary', methods=['GET'])
@require_role('teacher')
def ai_summary():
    teacher = current_user()
    students = Student.query.filter_by(teacher_id=teacher.id).all()
    if not students:
        return jsonify({'top_students': [], 'summary': 'No student data available for AI summary.'})

    ranked_students = []
    for student in students:
        mark_values = [mark.marks for mark in student.marks]
        mark_percentage = round(sum(mark_values) / len(mark_values), 2) if mark_values else 0
        attendance = student.attendance
        attendance_percentage = 0
        if attendance and attendance.total_classes > 0:
            attendance_percentage = round((attendance.present / attendance.total_classes) * 100, 2)
        overall_score = round((mark_percentage * 0.70) + (attendance_percentage * 0.30), 2)
        ranked_students.append({
            'student_id': student.id,
            'name': student.name,
            'marks': mark_percentage,
            'attendance': attendance_percentage,
            'overall_score': overall_score,
        })

    ranked_students.sort(key=lambda item: item['overall_score'], reverse=True)
    top_3 = ranked_students[:3]

    if not os.environ.get('OPENAI_API_KEY'):
        return jsonify({'top_students': top_3, 'summary': 'OpenAI key is not configured.'})

    try:
        client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        payload = {
            'top_students': top_3,
            'context': 'These are sorted by backend-calculated overall score from marks and attendance.'
        }
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {'role': 'system', 'content': 'You are an educational performance assistant. Summarize the top 3 students using only the supplied data and keep the response concise.'},
                {'role': 'user', 'content': json.dumps(payload)}
            ],
            temperature=0.5,
            max_tokens=250,
        )
        summary = response.choices[0].message.content.strip()
    except AuthenticationError:
        return jsonify({'top_students': top_3, 'summary': 'OpenAI API key is invalid.'}), 503
    except RateLimitError:
        return jsonify({'top_students': top_3, 'summary': 'OpenAI rate limit reached. Please try again later.'}), 429
    except APIConnectionError:
        return jsonify({'top_students': top_3, 'summary': 'Unable to connect to OpenAI. Please try again later.'}), 503
    except APIError:
        return jsonify({'top_students': top_3, 'summary': 'Unable to generate AI summary right now.'}), 502

    return jsonify({'top_students': top_3, 'summary': summary})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=os.environ.get('FLASK_DEBUG', '1') == '1')
