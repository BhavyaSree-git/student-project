import json
import os
import smtplib
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage
from functools import wraps
from pathlib import Path
from urllib.parse import quote_plus

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
import os

load_dotenv()

def load_local_env_file():
    """Load root .env for direct local runs without overriding real environment variables."""
    env_file = Path(__file__).resolve().parent.parent / '.env'
    if not env_file.exists():
        return

    for raw_line in env_file.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


load_local_env_file()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'student-management-secret-key-super-secure')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Setup CORS with credentials for local dev
CORS(
    app,
    supports_credentials=True,
    origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
        'http://localhost:5000',
        r'^http://192\.168\.\d{1,3}\.\d{1,3}:\d+$',
    ],
)


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


def isoformat_or_none(value):
    return value.isoformat() if value is not None else None


def send_teacher_credentials_email(teacher, temporary_password):
    """Send the initial credentials using the SMTP settings supplied by the deployer."""
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    sender = os.environ.get('SMTP_FROM') or smtp_username
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))

    if not all([smtp_host, smtp_username, smtp_password, sender]):
        raise RuntimeError('Email is not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM.')

    message = EmailMessage()
    message['Subject'] = 'Your EduCore teacher login credentials'
    message['From'] = sender
    message['To'] = teacher.email
    message.set_content(f'''Hello {teacher.name},

This is your credentials to log in to the EduCore Student Management Platform.

Email: {teacher.email}
Temporary password: {temporary_password}

For your account security, you will be asked to create a new password immediately after your first sign-in.

Regards,
{teacher.college.college_name if teacher.college else 'EduCore'}''')

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        smtp.login(smtp_username, smtp_password)
        smtp.send_message(message)


# ---------------------------------------------------------
# DATABASE MODELS
# ---------------------------------------------------------

class Admin(db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': 'admin',
            'created_at': isoformat_or_none(self.created_at),
        }


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
    approval_status = db.Column(db.String(30), default='PENDING', nullable=False)  # PENDING, APPROVED, REJECTED
    rejection_reason = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=False, nullable=False)
    deactivation_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    departments = db.relationship('Department', back_populates='college', cascade='all, delete-orphan')
    subjects = db.relationship('Subject', back_populates='college', cascade='all, delete-orphan')
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
            'role': 'college',
            'created_at': isoformat_or_none(self.created_at),
            'updated_at': isoformat_or_none(self.updated_at),
        }


class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    college = db.relationship('College', back_populates='departments')
    subjects = db.relationship('Subject', back_populates='department', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'college_id': self.college_id,
            'name': self.name,
            'code': self.code,
            'subject_count': len(self.subjects),
            'created_at': isoformat_or_none(self.created_at),
            'updated_at': isoformat_or_none(self.updated_at),
        }


class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    college = db.relationship('College', back_populates='subjects')
    department = db.relationship('Department', back_populates='subjects')

    def to_dict(self):
        return {
            'id': self.id,
            'college_id': self.college_id,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'name': self.name,
            'code': self.code,
            'created_at': isoformat_or_none(self.created_at),
            'updated_at': isoformat_or_none(self.updated_at),
        }


class Teacher(db.Model):
    __tablename__ = 'teachers'
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    employee_id = db.Column(db.String(80), nullable=True)
    designation = db.Column(db.String(100), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    force_password_reset = db.Column(db.Boolean, default=False, nullable=False)
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
            'phone': self.phone,
            'employee_id': self.employee_id,
            'designation': self.designation,
            'department': self.department,
            'subject': self.subject,
            'is_active': self.is_active,
            'force_password_reset': self.force_password_reset,
            'college_name': self.college.college_name if self.college else None,
            'role': 'teacher',
            'created_at': isoformat_or_none(self.created_at),
            'updated_at': isoformat_or_none(self.updated_at),
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

    __table_args__ = (
        db.UniqueConstraint('college_id', 'student_id', name='uq_student_college_student_id'),
    )

    college = db.relationship('College', back_populates='students')
    teacher = db.relationship('Teacher', back_populates='students')
    marks = db.relationship('Marks', back_populates='student', cascade='all, delete-orphan')
    attendance = db.relationship('Attendance', back_populates='student', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        mark_values = [m.marks for m in self.marks] if self.marks else []
        avg_marks = round(sum(mark_values) / len(mark_values), 2) if mark_values else 0
        total_marks = round(sum(mark_values), 2) if mark_values else 0
        attendance_info = self.attendance.to_dict() if self.attendance else {
            'student_id': self.id,
            'total_classes': 0,
            'present': 0,
            'absent': 0,
            'attendance_percentage': 0,
        }

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
            'average_marks': avg_marks,
            'total_marks': total_marks,
            'marks_count': len(mark_values),
            'attendance_percentage': attendance_info['attendance_percentage'],
            'attendance': attendance_info,
            'created_at': isoformat_or_none(self.created_at),
            'updated_at': isoformat_or_none(self.updated_at),
        }


class Marks(db.Model):
    __tablename__ = 'marks'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject = db.Column(db.String(120), nullable=False)
    marks = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject', name='uq_student_subject'),
    )

    student = db.relationship('Student', back_populates='marks')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject': self.subject,
            'marks': self.marks,
            'created_at': isoformat_or_none(self.created_at),
            'updated_at': isoformat_or_none(self.updated_at),
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
            'created_at': isoformat_or_none(self.created_at),
            'updated_at': isoformat_or_none(self.updated_at),
        }


# ---------------------------------------------------------
# DATABASE INITIALIZATION & DEFAULT SEED
# ---------------------------------------------------------

def ensure_teacher_schema():
    """Add teacher columns that were introduced after the original database schema."""
    extra_columns = {
        'teachers': [
            ('phone', 'VARCHAR(50)'),
            ('employee_id', 'VARCHAR(80)'),
            ('designation', 'VARCHAR(100)'),
            ('force_password_reset', 'BOOLEAN NOT NULL DEFAULT 0'),
        ],
    }

    with db.engine.begin() as conn:
        inspector = inspect(conn)
        for table_name, columns in extra_columns.items():
            if table_name not in inspector.get_table_names():
                continue
            existing = {column['name'] for column in inspector.get_columns(table_name)}
            for column_name, column_type in columns:
                if column_name not in existing:
                    conn.execute(db.text(f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}'))


with app.app_context():
    db.create_all()
    ensure_teacher_schema()

    admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    if not Admin.query.filter_by(username=admin_username).first():
        db.session.add(Admin(username=admin_username, password_hash=generate_password_hash(admin_password)))
        db.session.commit()


# ---------------------------------------------------------
# AUTHENTICATION HELPERS
# ---------------------------------------------------------

def current_user():
    user = session.get('user')
    if not user:
        return None

    user_id = user.get('id')
    role = user.get('role')
    if role == 'admin':
        return db.session.get(Admin, user_id)
    if role == 'college':
        return db.session.get(College, user_id)
    if role == 'teacher':
        return db.session.get(Teacher, user_id)
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

            if role == 'teacher':
                if not user.is_active:
                    return jsonify({'error': 'Your teacher account is inactive.'}), 403
                if not user.college or user.college.approval_status != 'APPROVED':
                    return jsonify({'error': 'Your college is not approved yet.'}), 403
                if not user.college.is_active:
                    return jsonify({'error': 'Your college account is currently inactive.'}), 403
                if user.force_password_reset and request.endpoint != 'reset_teacher_password':
                    return jsonify({
                        'error': 'You must reset your temporary password before accessing the platform.',
                        'must_reset_password': True,
                    }), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def require_approved_college_access(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        college = current_user()
        if college is None:
            return jsonify({'success': False, 'message': 'Unauthorized. Please log in again.'}), 401
        if not isinstance(college, College):
            return jsonify({'success': False, 'message': 'College access required.'}), 403
        if college.approval_status != 'APPROVED' or not college.is_active:
            return jsonify({'success': False, 'message': 'College approval is required for this action.'}), 403
        return fn(*args, **kwargs)
    return wrapper


# ---------------------------------------------------------
# HEALTH & AUTH ROUTES
# ---------------------------------------------------------

@app.errorhandler(404)
def handle_not_found(_error):
    return jsonify({'error': 'API endpoint not found.'}), 404


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    if isinstance(error, HTTPException):
        return jsonify({'error': error.description or 'Request failed.'}), error.code
    app.logger.exception('Unhandled server error')
    return jsonify({'error': 'Internal server error. Please try again.'}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'app': 'Student Management System API'})


@app.route('/api/auth/me', methods=['GET'])
def get_current_user_info():
    user = current_user()
    if not user:
        return jsonify({'user': None, 'authenticated': False}), 200

    payload = user.to_dict()
    return jsonify({'user': payload, 'authenticated': True}), 200


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

    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

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
    return jsonify({'message': 'College registration submitted. Pending Admin approval.', 'college': college.to_dict()}), 201


@app.route('/api/auth/college/login', methods=['POST'])
def college_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))

    college = College.query.filter_by(email=email).first()
    if not college:
        return jsonify({
            'error': 'No college account found for this email. Please register first, then wait for Admin approval.',
        }), 401

    if not college.password_hash or not check_password_hash(college.password_hash, password):
        return jsonify({'error': 'Invalid college password.'}), 401

    if college.approval_status == 'REJECTED':
        return jsonify({
            'error': 'Registration Rejected',
            'message': 'Your college registration has been rejected by the administrator.',
            'reason': f"Reason: {college.rejection_reason or 'No reason provided.'}",
        }), 403

    if college.approval_status == 'APPROVED' and not college.is_active:
        return jsonify({
            'error': 'College Account Inactive',
            'message': 'Your college account has been deactivated by the administrator.',
        }), 403

    session.permanent = True
    session['user'] = {'role': 'college', 'id': college.id}
    return jsonify({
        'message': 'College login successful.',
        'college': college.to_dict(),
        'user': college.to_dict(),
    })


@app.route('/api/auth/teacher/login', methods=['POST'])
def teacher_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))

    teacher = Teacher.query.filter_by(email=email).first()
    if not teacher or not check_password_hash(teacher.password_hash, password):
        return jsonify({'error': 'Invalid teacher email or password.'}), 401

    if not teacher.is_active:
        return jsonify({'error': 'Your teacher account is deactivated. Please contact your college administrator.'}), 403
    if not teacher.college or teacher.college.approval_status != 'APPROVED':
        return jsonify({'error': 'Your college is not approved yet.'}), 403
    if not teacher.college.is_active:
        return jsonify({'error': 'Your college account is currently deactivated.'}), 403

    session['user'] = {'role': 'teacher', 'id': teacher.id}
    return jsonify({
        'message': 'Teacher login successful.',
        'user': teacher.to_dict(),
        'must_reset_password': teacher.force_password_reset,
    })


@app.route('/api/auth/teacher/reset-password', methods=['POST'])
@require_role('teacher')
def reset_teacher_password():
    data = request.get_json(silent=True) or {}
    new_password = str(data.get('new_password', ''))
    confirm_password = str(data.get('confirm_password', ''))

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long.'}), 400
    if new_password != confirm_password:
        return jsonify({'error': 'New password and confirm password do not match.'}), 400

    teacher = current_user()
    teacher.password_hash = generate_password_hash(new_password)
    teacher.force_password_reset = False
    teacher.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Password updated successfully.', 'user': teacher.to_dict()})


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully.'})


# ---------------------------------------------------------
# ADMIN ENDPOINTS
# ---------------------------------------------------------

@app.route('/api/admin/dashboard', methods=['GET'])
@require_role('admin')
def admin_dashboard():
    total_colleges = College.query.count()
    pending = College.query.filter_by(approval_status='PENDING').count()
    approved = College.query.filter_by(approval_status='APPROVED').count()
    rejected = College.query.filter_by(approval_status='REJECTED').count()
    active = College.query.filter_by(is_active=True).count()
    inactive = College.query.filter_by(is_active=False).count()
    total_teachers = Teacher.query.count()
    total_students = Student.query.count()

    return jsonify({
        'total_colleges': total_colleges,
        'pending_colleges': pending,
        'approved_colleges': approved,
        'rejected_colleges': rejected,
        'active_colleges': active,
        'inactive_colleges': inactive,
        'total_teachers': total_teachers,
        'total_students': total_students,
    })


@app.route('/api/admin/colleges', methods=['GET'])
@require_role('admin')
def admin_colleges():
    colleges = College.query.order_by(College.created_at.desc()).all()
    result = []
    for c in colleges:
        teacher_count = Teacher.query.filter_by(college_id=c.id).count()
        student_count = Student.query.filter_by(college_id=c.id).count()
        result.append({
            **c.to_dict(),
            'teacher_count': teacher_count,
            'student_count': student_count,
        })
    return jsonify(result)


@app.route('/api/admin/colleges/<int:college_id>/teachers', methods=['GET'])
@require_role('admin')
def admin_get_college_teachers(college_id):
    college = College.query.get_or_404(college_id)
    teachers = Teacher.query.filter_by(college_id=college.id).order_by(Teacher.name.asc()).all()
    result = []
    for t in teachers:
        student_count = Student.query.filter_by(teacher_id=t.id).count()
        result.append({
            **t.to_dict(),
            'student_count': student_count,
        })
    return jsonify({
        'college': college.to_dict(),
        'teachers': result,
    })


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
    return jsonify({'message': f'College "{college.college_name}" has been APPROVED and activated.', 'college': college.to_dict()})


@app.route('/api/admin/colleges/<int:college_id>/reject', methods=['POST'])
@require_role('admin')
def reject_college(college_id):
    college = College.query.get_or_404(college_id)
    data = request.get_json(silent=True) or {}
    reason = str(data.get('reason', '')).strip() or 'Application did not meet requirements.'
    college.approval_status = 'REJECTED'
    college.is_active = False
    college.rejection_reason = reason
    college.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': f'College "{college.college_name}" has been REJECTED.', 'college': college.to_dict()})


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
    return jsonify({'message': f'College "{college.college_name}" activated successfully.', 'college': college.to_dict()})


@app.route('/api/admin/colleges/<int:college_id>/deactivate', methods=['POST'])
@require_role('admin')
def deactivate_college(college_id):
    college = College.query.get_or_404(college_id)
    data = request.get_json(silent=True) or {}
    reason = str(data.get('reason', '')).strip() or 'Deactivated by administrator.'
    college.is_active = False
    college.deactivation_reason = reason
    college.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': f'College "{college.college_name}" deactivated.', 'college': college.to_dict()})


# ---------------------------------------------------------
# COLLEGE ENDPOINTS
# ---------------------------------------------------------

@app.route('/api/college/profile', methods=['GET'])
@require_role('college')
def college_profile():
    college = current_user()
    teacher_count = Teacher.query.filter_by(college_id=college.id).count()
    student_count = Student.query.filter_by(college_id=college.id).count()
    return jsonify({
        **college.to_dict(),
        'total_teachers': teacher_count,
        'total_students': student_count,
    })


@app.route('/api/college/departments', methods=['GET'])
@require_role('college')
def college_departments():
    college = current_user()
    departments = Department.query.filter_by(college_id=college.id).order_by(Department.name.asc()).all()
    return jsonify([d.to_dict() for d in departments])


@app.route('/api/college/departments', methods=['POST'])
@require_role('college')
@require_approved_college_access
def create_college_department():
    college = current_user()
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    code = str(data.get('code', '')).strip()
    if not name:
        return jsonify({'error': 'Department name is required.'}), 400

    if Department.query.filter_by(college_id=college.id, name=name).first():
        return jsonify({'error': 'This department already exists for your college.'}), 409

    department = Department(college_id=college.id, name=name, code=code or None)
    db.session.add(department)
    db.session.commit()
    return jsonify({'message': 'Department created successfully.', 'department': department.to_dict()}), 201


@app.route('/api/college/subjects', methods=['GET'])
@require_role('college')
def college_subjects():
    college = current_user()
    subjects = Subject.query.filter_by(college_id=college.id).order_by(Subject.name.asc()).all()
    return jsonify([s.to_dict() for s in subjects])


@app.route('/api/college/subjects', methods=['POST'])
@require_role('college')
@require_approved_college_access
def create_college_subject():
    college = current_user()
    data = request.get_json(silent=True) or {}
    department_id = data.get('department_id')
    name = str(data.get('name', '')).strip()
    code = str(data.get('code', '')).strip()
    try:
        department_id = int(department_id)
    except (TypeError, ValueError):
        department_id = None
    if not department_id or not name:
        return jsonify({'error': 'Department and subject name are required.'}), 400

    department = Department.query.filter_by(id=department_id, college_id=college.id).first()
    if not department:
        return jsonify({'error': 'Invalid department selected.'}), 400

    if Subject.query.filter_by(college_id=college.id, department_id=department.id, name=name).first():
        return jsonify({'error': 'This subject already exists in the selected department.'}), 409

    subject = Subject(college_id=college.id, department_id=department.id, name=name, code=code or None)
    db.session.add(subject)
    db.session.commit()
    return jsonify({'message': 'Subject created successfully.', 'subject': subject.to_dict()}), 201


@app.route('/api/college/teachers', methods=['GET'])
@require_role('college')
@require_approved_college_access
def college_teachers():
    college = current_user()
    teachers = Teacher.query.filter_by(college_id=college.id).order_by(Teacher.created_at.desc()).all()
    result = []
    for t in teachers:
        student_count = Student.query.filter_by(teacher_id=t.id).count()
        result.append({
            **t.to_dict(),
            'student_count': student_count,
        })
    return jsonify(result)


@app.route('/api/college/teachers', methods=['POST'])
@require_role('college')
@require_approved_college_access
def create_teacher_for_college():
    college = current_user()
    data = request.get_json(silent=True) or {}
    required_fields = ['name', 'email', 'password', 'confirm_password', 'department', 'subject']
    missing = [field for field in required_fields if not str(data.get(field, '')).strip()]
    if missing:
        return jsonify({'error': 'Missing fields: ' + ', '.join(missing)}), 400

    if data['password'] != data['confirm_password']:
        return jsonify({'error': 'Password and confirm password do not match.'}), 400

    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    email = str(data['email']).strip().lower()
    if Teacher.query.filter_by(email=email).first():
        return jsonify({'error': 'A teacher with this email already exists in the system.'}), 409

    department_name = str(data['department']).strip()
    department = Department.query.filter_by(college_id=college.id, name=department_name).first()
    if not department:
        department_names = [d.name for d in Department.query.filter_by(college_id=college.id).all()]
        if department_names:
            return jsonify({'error': f'Department must be one of: {", ".join(department_names)}'}), 400

    subject_name = str(data['subject']).strip()
    if department:
        allowed_subject = Subject.query.filter_by(college_id=college.id, department_id=department.id, name=subject_name).first()
        if not allowed_subject:
            department_subjects = [s.name for s in Subject.query.filter_by(college_id=college.id, department_id=department.id).all()]
            if department_subjects:
                return jsonify({'error': f'Subject must be one of: {", ".join(department_subjects)}'}), 400

    teacher = Teacher(
        college_id=college.id,
        name=str(data['name']).strip(),
        email=email,
        phone=str(data.get('phone', '')).strip() or None,
        employee_id=str(data.get('employee_id', '')).strip() or None,
        designation=str(data.get('designation', '')).strip() or None,
        password_hash=generate_password_hash(data['password']),
        force_password_reset=True,
        department=department_name,
        subject=subject_name,
        is_active=True,
    )
    db.session.add(teacher)
    try:
        db.session.flush()
        send_teacher_credentials_email(teacher, data['password'])
        db.session.commit()
    except Exception as error:
        db.session.rollback()
        app.logger.exception('Unable to create teacher and send credentials email')
        return jsonify({'error': f'Could not send the credentials email. {str(error)}'}), 502

    return jsonify({
        'message': f'Credentials created and emailed to {teacher.email}. The teacher must reset their password after first sign-in.',
        'teacher': teacher.to_dict(),
    }), 201


@app.route('/api/college/teachers/<int:teacher_id>', methods=['DELETE'])
@require_role('college')
@require_approved_college_access
def delete_teacher_for_college(teacher_id):
    college = current_user()
    teacher = Teacher.query.filter_by(id=teacher_id, college_id=college.id).first_or_404()
    db.session.delete(teacher)
    db.session.commit()
    return jsonify({'message': f'Teacher "{teacher.name}" deleted successfully.'})


@app.route('/api/college/students', methods=['GET'])
@require_role('college')
@require_approved_college_access
def college_all_students():
    college = current_user()
    students = Student.query.filter_by(college_id=college.id).order_by(Student.name.asc()).all()
    result = []
    for s in students:
        s_data = s.to_dict()
        s_data['teacher_name'] = s.teacher.name if s.teacher else 'Unassigned'
        result.append(s_data)
    return jsonify(result)


# ---------------------------------------------------------
# TEACHER ENDPOINTS
# ---------------------------------------------------------

@app.route('/api/teacher/profile', methods=['GET'])
@require_role('teacher')
def teacher_profile():
    teacher = current_user()
    return jsonify(teacher.to_dict())


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
        'college_name': teacher.college.college_name if teacher.college else '',
        'department': teacher.department,
        'subject': teacher.subject,
        'total_students': len(students),
        'average_marks': average_marks,
        'average_attendance': average_attendance,
    })


@app.route('/api/teacher/students', methods=['GET'])
@require_role('teacher')
def teacher_students():
    teacher = current_user()
    students = Student.query.filter_by(teacher_id=teacher.id).order_by(Student.created_at.desc()).all()
    return jsonify([student.to_dict() for student in students])


# ---------------------------------------------------------
# STUDENT MANAGEMENT CRUD (TEACHER ONLY)
# ---------------------------------------------------------

@app.route('/api/students', methods=['GET'])
@require_role('teacher')
def list_students_route():
    teacher = current_user()
    query = str(request.args.get('search', '')).strip()
    students_query = Student.query.filter_by(teacher_id=teacher.id)

    if query:
        search_term = f'%{query}%'
        students_query = students_query.filter(
            db.or_(
                Student.name.ilike(search_term),
                Student.student_id.ilike(search_term),
                Student.email.ilike(search_term),
                Student.department.ilike(search_term),
                Student.course.ilike(search_term),
            )
        )

    students = students_query.order_by(Student.name.asc()).all()
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

    submitted_student_id = str(data['student_id']).strip()
    if Student.query.filter_by(college_id=teacher.college_id, student_id=submitted_student_id).first():
        return jsonify({'error': f'A student with ID "{submitted_student_id}" already exists in your college.'}), 409

    student = Student(
        college_id=teacher.college_id,
        teacher_id=teacher.id,
        student_id=submitted_student_id,
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
    db.session.flush()

    # Create default attendance record (0 total, 0 present)
    attendance = Attendance(student_id=student.id, total_classes=0, present=0, absent=0)
    db.session.add(attendance)
    db.session.commit()

    return jsonify({'message': f'Student "{student.name}" added successfully.', 'student': student.to_dict()}), 201


@app.route('/api/students/<int:student_id>', methods=['GET'])
@require_role('teacher')
def get_student_details(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'You are not authorized to view this student.'}), 403

    payload = student.to_dict()
    payload['marks_list'] = [mark.to_dict() for mark in student.marks]
    return jsonify(payload)


@app.route('/api/students/<int:student_id>', methods=['PUT'])
@require_role('teacher')
def update_student_route(student_id):
    student = Student.query.get_or_404(student_id)
    teacher = current_user()
    if student.teacher_id != teacher.id:
        return jsonify({'error': 'You are not authorized to update this student.'}), 403

    data = request.get_json(silent=True) or {}
    if 'student_id' in data and str(data['student_id']).strip():
        new_student_id = str(data['student_id']).strip()
        duplicate = Student.query.filter(
            Student.college_id == teacher.college_id,
            Student.student_id == new_student_id,
            Student.id != student.id,
        ).first()
        if duplicate:
            return jsonify({'error': f'A student with ID "{new_student_id}" already exists in your college.'}), 409
        student.student_id = new_student_id

    for field in ['name', 'email', 'phone', 'date_of_birth', 'gender', 'department', 'course', 'year', 'section']:
        if field in data and str(data[field]).strip():
            setattr(student, field, str(data[field]).strip())

    if student.email:
        student.email = student.email.lower()

    db.session.commit()
    return jsonify({'message': f'Student "{student.name}" updated successfully.', 'student': student.to_dict()})


@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@require_role('teacher')
def delete_student_route(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'You are not authorized to delete this student.'}), 403

    name = student.name
    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': f'Student "{name}" deleted successfully.'})


# ---------------------------------------------------------
# MARKS MANAGEMENT (TEACHER ONLY)
# ---------------------------------------------------------

@app.route('/api/marks', methods=['GET'])
@require_role('teacher')
def get_marks():
    teacher = current_user()
    student_ids = [s.id for s in Student.query.filter_by(teacher_id=teacher.id).all()]
    if not student_ids:
        return jsonify([])
    marks = Marks.query.filter(Marks.student_id.in_(student_ids)).order_by(Marks.created_at.desc()).all()
    return jsonify([m.to_dict() for m in marks])


@app.route('/api/students/<int:student_id>/marks', methods=['GET'])
@require_role('teacher')
def get_student_marks(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'Unauthorized.'}), 403

    marks = Marks.query.filter_by(student_id=student.id).order_by(Marks.subject.asc()).all()
    mark_values = [m.marks for m in marks]
    avg_marks = round(sum(mark_values) / len(mark_values), 2) if mark_values else 0
    total_marks = round(sum(mark_values), 2) if mark_values else 0

    return jsonify({
        'student': student.to_dict(),
        'marks': [m.to_dict() for m in marks],
        'total_marks': total_marks,
        'average_marks': avg_marks,
        'percentage': avg_marks,
    })


@app.route('/api/students/<int:student_id>/marks', methods=['POST'])
@require_role('teacher')
def add_or_update_student_marks(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'Unauthorized.'}), 403

    data = request.get_json(silent=True) or {}
    subjects_list = data.get('subjects')
    if not subjects_list:
        subj = str(data.get('subject', '')).strip()
        mk = data.get('marks')
        if not subj or mk is None:
            return jsonify({'error': 'Subject and marks value are required.'}), 400
        subjects_list = [{'subject': subj, 'marks': mk}]

    saved_marks = []
    for item in subjects_list:
        subj_name = str(item.get('subject', '')).strip()
        if not subj_name:
            continue
        try:
            val = float(item.get('marks', 0))
        except (ValueError, TypeError):
            return jsonify({'error': f'Marks for {subj_name} must be a number.'}), 400

        if val < 0 or val > 100:
            return jsonify({'error': f'Marks for {subj_name} must be between 0 and 100.'}), 400

        existing = Marks.query.filter_by(student_id=student.id, subject=subj_name).first()
        if existing:
            existing.marks = val
            existing.updated_at = datetime.utcnow()
            saved_marks.append(existing)
        else:
            new_mark = Marks(student_id=student.id, subject=subj_name, marks=val)
            db.session.add(new_mark)
            saved_marks.append(new_mark)

    db.session.commit()
    return jsonify({
        'message': f'Marks recorded successfully for {student.name}.',
        'marks': [m.to_dict() for m in saved_marks],
    })


@app.route('/api/marks', methods=['POST'])
@require_role('teacher')
def create_mark_direct():
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
    if marks_value < 0 or marks_value > 100:
        return jsonify({'error': 'Marks must be between 0 and 100.'}), 400

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
def update_mark_direct(mark_id):
    mark = Marks.query.get_or_404(mark_id)
    teacher = current_user()
    if mark.student.teacher_id != teacher.id:
        return jsonify({'error': 'You are not authorized to update these marks.'}), 403

    data = request.get_json(silent=True) or {}
    if 'subject' in data and str(data['subject']).strip():
        mark.subject = str(data['subject']).strip()
    if 'marks' in data and data['marks'] is not None:
        try:
            val = float(data['marks'])
            if val < 0 or val > 100:
                return jsonify({'error': 'Marks must be between 0 and 100.'}), 400
            mark.marks = val
        except (TypeError, ValueError):
            return jsonify({'error': 'Marks must be numeric.'}), 400

    mark.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Marks updated successfully.', 'marks': mark.to_dict()})


@app.route('/api/marks/<int:mark_id>', methods=['DELETE'])
@require_role('teacher')
def delete_mark(mark_id):
    mark = Marks.query.get_or_404(mark_id)
    if mark.student.teacher_id != current_user().id:
        return jsonify({'error': 'Unauthorized.'}), 403

    subject = mark.subject
    db.session.delete(mark)
    db.session.commit()
    return jsonify({'message': f'Marks for {subject} deleted.'})


# ---------------------------------------------------------
# ATTENDANCE MANAGEMENT (TEACHER ONLY)
# ---------------------------------------------------------

@app.route('/api/attendance', methods=['GET'])
@require_role('teacher')
def get_attendance_records():
    teacher = current_user()
    student_ids = [s.id for s in Student.query.filter_by(teacher_id=teacher.id).all()]
    if not student_ids:
        return jsonify([])
    records = Attendance.query.filter(Attendance.student_id.in_(student_ids)).all()
    return jsonify([r.to_dict() for r in records])


@app.route('/api/attendance', methods=['POST'])
@require_role('teacher')
def create_attendance_direct():
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
def update_attendance_direct(attendance_id):
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


@app.route('/api/students/<int:student_id>/attendance', methods=['GET'])
@require_role('teacher')
def get_student_attendance(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'Unauthorized.'}), 403

    record = student.attendance
    if not record:
        record = Attendance(student_id=student.id, total_classes=0, present=0, absent=0)
        db.session.add(record)
        db.session.commit()

    return jsonify({
        'student': student.to_dict(),
        'attendance': record.to_dict(),
    })


@app.route('/api/students/<int:student_id>/attendance', methods=['POST', 'PUT'])
@require_role('teacher')
def set_student_attendance(student_id):
    student = Student.query.get_or_404(student_id)
    if student.teacher_id != current_user().id:
        return jsonify({'error': 'Unauthorized.'}), 403

    data = request.get_json(silent=True) or {}
    total_classes = data.get('total_classes')
    present = data.get('present')

    if total_classes is None or present is None:
        return jsonify({'error': 'total_classes and present count are required.'}), 400

    try:
        total_classes = int(total_classes)
        present = int(present)
    except (TypeError, ValueError):
        return jsonify({'error': 'Total classes and present count must be integers.'}), 400

    if total_classes < 0 or present < 0:
        return jsonify({'error': 'Attendance numbers cannot be negative.'}), 400

    if present > total_classes:
        return jsonify({'error': 'Present count cannot exceed total classes.'}), 400

    absent = total_classes - present
    record = student.attendance
    if record:
        record.total_classes = total_classes
        record.present = present
        record.absent = absent
        record.updated_at = datetime.utcnow()
    else:
        record = Attendance(student_id=student.id, total_classes=total_classes, present=present, absent=absent)
        db.session.add(record)

    db.session.commit()
    return jsonify({
        'message': f'Attendance updated for {student.name}.',
        'attendance': record.to_dict(),
    })


# ---------------------------------------------------------
# AI SUMMARY FEATURE (TOP 3 RANKING + OPENAI)
# ---------------------------------------------------------

@app.route('/api/ai/summary', methods=['GET'])
@require_role('teacher')
def get_ai_summary():
    teacher = current_user()
    students = Student.query.filter_by(teacher_id=teacher.id).all()

    if not students:
        return jsonify({
            'top_students': [],
            'summary': 'No student records found in your class. Please add students, marks, and attendance first.'
        })

    # Calculate scores for all students
    ranked_students = []
    for student in students:
        mark_values = [m.marks for m in student.marks]
        mark_percentage = round(sum(mark_values) / len(mark_values), 2) if mark_values else 0
        attendance = student.attendance
        attendance_percentage = 0
        if attendance and attendance.total_classes > 0:
            attendance_percentage = round((attendance.present / attendance.total_classes) * 100, 2)

        # Weighted score: 70% Marks + 30% Attendance
        overall_score = round((mark_percentage * 0.70) + (attendance_percentage * 0.30), 2)

        ranked_students.append({
            'id': student.id,
            'student_id': student.student_id,
            'name': student.name,
            'department': student.department,
            'course': student.course,
            'marks': mark_percentage,
            'attendance': attendance_percentage,
            'overall_score': overall_score,
            'marks_count': len(mark_values),
        })

    # Sort descending by overall score
    ranked_students.sort(key=lambda item: item['overall_score'], reverse=True)
    top_3 = ranked_students[:3]

    openai_key = os.environ.get('OPENAI_API_KEY')
    openai_model = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')

    # If OpenAI Key is present, call OpenAI
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            system_prompt = (
                "You are an expert academic advisor. Provide a concise, motivating 3-4 sentence performance "
                "summary for the top 3 students based on their academic marks and attendance percentages. "
                "Highlight their strengths, consistency, and encouragement for continued excellence."
            )

            prompt_data = {
                'teacher_name': teacher.name,
                'subject': teacher.subject,
                'department': teacher.department,
                'top_3_students': [
                    {
                        'rank': idx + 1,
                        'name': s['name'],
                        'student_id': s['student_id'],
                        'marks_percentage': f"{s['marks']}%",
                        'attendance_percentage': f"{s['attendance']}%",
                        'composite_score': f"{s['overall_score']}%"
                    }
                    for idx, s in enumerate(top_3)
                ]
            }

            response = client.chat.completions.create(
                model=openai_model,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': f"Here is the student data: {json.dumps(prompt_data)}"}
                ],
                temperature=0.7,
                max_tokens=250
            )
            summary_text = response.choices[0].message.content.strip()
            return jsonify({
                'top_students': top_3,
                'summary': summary_text,
                'generated_by': 'OpenAI'
            })
        except Exception as e:
            fallback_text = (
                f"Top 3 Achievers Summary: {', '.join(s['name'] for s in top_3)} lead the class with exceptional "
                f"academic performance (average {round(sum(s['marks'] for s in top_3)/len(top_3), 1)}%) and outstanding "
                f"discipline (average attendance {round(sum(s['attendance'] for s in top_3)/len(top_3), 1)}%). "
                f"Their consistent engagement and exam performance serve as a benchmark for the entire department."
            )
            return jsonify({
                'top_students': top_3,
                'summary': fallback_text,
                'generated_by': 'Local Performance Engine'
            })

    # Default intelligent summary when OpenAI key is not set
    if len(top_3) == 1:
        fallback_text = (
            f"{top_3[0]['name']} demonstrates exemplary dedication with an academic score of {top_3[0]['marks']}% "
            f"and a stellar attendance record of {top_3[0]['attendance']}%. "
            f"Consistently leading the class in both coursework and participation."
        )
    else:
        names = [s['name'] for s in top_3]
        avg_m = round(sum(s['marks'] for s in top_3) / len(top_3), 1)
        avg_a = round(sum(s['attendance'] for s in top_3) / len(top_3), 1)
        fallback_text = (
            f"These top performers ({', '.join(names)}) exhibit extraordinary mastery and dedication with an average marks score of "
            f"{avg_m}% and an average attendance rate of {avg_a}%. "
            f"Their disciplined study habits and consistent classroom participation make them outstanding role models for the department."
        )

    return jsonify({
        'top_students': top_3,
        'summary': fallback_text,
        'generated_by': 'Local Performance Engine'
    })


# ---------------------------------------------------------
# QUICK SEED DATA HELPER (FOR EASY TESTING)
# ---------------------------------------------------------

@app.route('/api/seed-demo', methods=['POST'])
def seed_demo_data():
    """Endpoint to seed demo college, teacher, students, marks & attendance for testing."""
    demo_college = College.query.filter_by(email='college@stanford.edu').first()
    if not demo_college:
        demo_college = College(
            college_name='Stanford Institute of Technology',
            university_name='Stanford University',
            email='college@stanford.edu',
            phone='+1 650 723 2300',
            address='450 Jane Stanford Way',
            city='Stanford',
            state='California',
            country='USA',
            pincode='94305',
            website='https://stanford.edu',
            college_type='Private',
            password_hash=generate_password_hash('college123'),
            approval_status='APPROVED',
            is_active=True,
        )
        db.session.add(demo_college)
        db.session.flush()

    if not Department.query.filter_by(college_id=demo_college.id, name='Computer Science').first():
        dept = Department(college_id=demo_college.id, name='Computer Science', code='CS')
        db.session.add(dept)
        db.session.flush()
    else:
        dept = Department.query.filter_by(college_id=demo_college.id, name='Computer Science').first()

    if not Subject.query.filter_by(college_id=demo_college.id, department_id=dept.id, name='Algorithms & Data Structures').first():
        db.session.add(Subject(college_id=demo_college.id, department_id=dept.id, name='Algorithms & Data Structures', code='CS201'))

    demo_teacher = Teacher.query.filter_by(email='teacher@stanford.edu').first()
    if not demo_teacher:
        demo_teacher = Teacher(
            college_id=demo_college.id,
            name='Prof. Alan Turing',
            email='teacher@stanford.edu',
            password_hash=generate_password_hash('teacher123'),
            department='Computer Science',
            subject='Algorithms & Data Structures',
            is_active=True,
        )
        db.session.add(demo_teacher)
        db.session.flush()

    student_records = [
        ('CS101', 'Rahul Sharma', 'rahul@example.com', '+1 555 0101', '2003-05-14', 'Male', 'Computer Science', 'B.Tech', '3rd Year', 'A', [('Math', 95.0), ('Algorithms', 92.0), ('Data Structures', 96.0), ('Database', 94.0)], 100, 96),
        ('CS102', 'Priya Patel', 'priya@example.com', '+1 555 0102', '2003-08-22', 'Female', 'Computer Science', 'B.Tech', '3rd Year', 'A', [('Math', 91.0), ('Algorithms', 89.0), ('Data Structures', 94.0), ('Database', 92.0)], 100, 94),
        ('CS103', 'Arun Kumar', 'arun@example.com', '+1 555 0103', '2002-11-03', 'Male', 'Computer Science', 'B.Tech', '3rd Year', 'A', [('Math', 88.0), ('Algorithms', 90.0), ('Data Structures', 91.0), ('Database', 93.0)], 100, 95),
        ('CS104', 'Neha Singh', 'neha@example.com', '+1 555 0104', '2003-02-19', 'Female', 'Computer Science', 'B.Tech', '3rd Year', 'B', [('Math', 82.0), ('Algorithms', 85.0), ('Data Structures', 80.0), ('Database', 88.0)], 100, 89),
        ('CS105', 'Vikram Aditya', 'vikram@example.com', '+1 555 0105', '2002-09-30', 'Male', 'Computer Science', 'B.Tech', '3rd Year', 'B', [('Math', 76.0), ('Algorithms', 78.0), ('Data Structures', 82.0), ('Database', 79.0)], 100, 84),
    ]

    for s_id, name, email, phone, dob, gender, dept, course, year, sec, marks_list, total_cls, present_cls in student_records:
        existing = Student.query.filter_by(college_id=demo_college.id, student_id=s_id).first()
        if not existing:
            st = Student(
                college_id=demo_college.id,
                teacher_id=demo_teacher.id,
                student_id=s_id,
                name=name,
                email=email,
                phone=phone,
                date_of_birth=dob,
                gender=gender,
                department=dept,
                course=course,
                year=year,
                section=sec,
            )
            db.session.add(st)
            db.session.flush()

            for subj, score in marks_list:
                db.session.add(Marks(student_id=st.id, subject=subj, marks=score))

            db.session.add(Attendance(
                student_id=st.id,
                total_classes=total_cls,
                present=present_cls,
                absent=total_cls - present_cls,
            ))

    db.session.commit()
    return jsonify({'message': 'Demo data seeded successfully! You can log in as Admin (admin/admin123), College (college@stanford.edu/college123), or Teacher (teacher@stanford.edu/teacher123).'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=os.environ.get('FLASK_DEBUG', '1') == '1')
