import os
from urllib.parse import quote_plus
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)

db_url = os.environ.get('DATABASE_URL')
if not db_url:
    db_user = os.environ.get('DATABASE_USER') or os.environ.get('POSTGRES_USER')
    db_pass = os.environ.get('DATABASE_PASSWORD') or os.environ.get('POSTGRES_PASSWORD')
    db_name = os.environ.get('DATABASE_NAME') or os.environ.get('POSTGRES_DB')
    db_host = os.environ.get('DATABASE_HOST', 'localhost')
    db_port = os.environ.get('DATABASE_PORT', '5432')

    if db_user and db_pass and db_name:
        user = quote_plus(db_user)
        password = quote_plus(db_pass)
        db_url = f'postgresql://{user}:{password}@{db_host}:{db_port}/{db_name}'
    else:
        db_url = 'sqlite:///students.db'

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    roll_number = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    year = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'roll_number': self.roll_number,
            'email': self.email,
            'department': self.department,
            'year': self.year,
        }

required_fields = ['name', 'roll_number', 'email', 'department', 'year']

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    subject_name = db.Column(db.String(120), nullable=False)
    marks_obtained = db.Column(db.Integer, nullable=False)
    max_marks = db.Column(db.Integer, nullable=False)

    student = db.relationship('Student', back_populates='subjects')

    def to_dict(self):
        return {
            'id': self.id,
            'subject_name': self.subject_name,
            'marks_obtained': self.marks_obtained,
            'max_marks': self.max_marks,
        }

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False, unique=True)
    total_classes = db.Column(db.Integer, default=0, nullable=False)
    attended_classes = db.Column(db.Integer, default=0, nullable=False)

    student = db.relationship('Student', back_populates='attendance')

    def to_dict(self):
        return {
            'id': self.id,
            'total_classes': self.total_classes,
            'attended_classes': self.attended_classes,
        }

Student.subjects = db.relationship(
    'Subject',
    back_populates='student',
    cascade='all, delete-orphan',
    lazy='select',
)
Student.attendance = db.relationship(
    'Attendance',
    back_populates='student',
    uselist=False,
    cascade='all, delete-orphan',
    lazy='select',
)


def calculate_grade(average_percentage):
    if average_percentage >= 90:
        return 'A+'
    if average_percentage >= 80:
        return 'A'
    if average_percentage >= 70:
        return 'B'
    if average_percentage >= 60:
        return 'C'
    if average_percentage >= 50:
        return 'D'
    return 'F'


def calculate_attendance_percentage(attendance):
    if attendance is None or attendance['total_classes'] == 0:
        return 0
    return round((attendance['attended_classes'] / attendance['total_classes']) * 100, 1)


def attendance_status(attendance_percentage):
    return 'Good' if attendance_percentage >= 75 else 'Low Attendance'


def performance_status(average_percentage, attendance_percentage):
    if average_percentage >= 75 and attendance_percentage >= 75:
        return 'Excellent'
    if average_percentage >= 50 and attendance_percentage >= 75:
        return 'Good'
    return 'Needs Improvement'


def calculate_student_performance(student):
    subjects = student.subjects
    if not subjects:
        total_marks = 0
        average_percentage = 0
    else:
        total_obtained = sum(subject.marks_obtained for subject in subjects)
        total_possible = sum(subject.max_marks for subject in subjects)
        total_marks = total_obtained
        average_percentage = round((total_obtained / total_possible) * 100, 1) if total_possible else 0

    attendance = student.attendance.to_dict() if student.attendance else {'total_classes': 0, 'attended_classes': 0}
    attendance_pct = calculate_attendance_percentage(attendance)
    grade = calculate_grade(average_percentage)
    attendance_state = attendance_status(attendance_pct)
    performance_state = performance_status(average_percentage, attendance_pct)

    return {
        'total_marks': total_marks,
        'average_percentage': average_percentage,
        'grade': grade,
        'attendance_percentage': attendance_pct,
        'attendance_status': attendance_state,
        'performance_status': performance_state,
    }

with app.app_context():
    db.create_all()

@app.route('/api/hello', methods=['GET'])
def hello():
    """Simple API endpoint for backend verification."""
    return jsonify({
        'message': 'Hello from Flask backend!'
    })

@app.route('/api/students', methods=['GET'])
def list_students():
    """Return the list of students from the database."""
    students = Student.query.all()
    return jsonify([student.to_dict() for student in students])

@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    """Return a single student by ID, including subjects and attendance."""
    student = Student.query.get(student_id)
    if student is None:
        return jsonify({'error': 'Student not found'}), 404

    performance = calculate_student_performance(student)
    return jsonify({
        **student.to_dict(),
        'subjects': [subject.to_dict() for subject in student.subjects],
        'attendance': student.attendance.to_dict() if student.attendance else {'total_classes': 0, 'attended_classes': 0},
        **performance,
    })

@app.route('/api/students', methods=['POST'])
def create_student():
    """Create a new student in the database."""
    data = request.get_json() or {}
    missing = [field for field in required_fields if not str(data.get(field, '')).strip()]
    if missing:
        return jsonify({'error': 'Missing fields: ' + ', '.join(missing)}), 400

    student = Student(
        name=data['name'].strip(),
        roll_number=data['roll_number'].strip(),
        email=data['email'].strip(),
        department=data['department'].strip(),
        year=data['year'].strip(),
    )
    db.session.add(student)
    db.session.flush()

    attendance = Attendance(
        student_id=student.id,
        total_classes=0,
        attended_classes=0,
    )
    db.session.add(attendance)
    db.session.commit()
    return jsonify(student.to_dict()), 201

@app.route('/api/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    """Update an existing student."""
    student = Student.query.get(student_id)
    if student is None:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json() or {}
    for field in required_fields:
        if field in data and str(data[field]).strip():
            setattr(student, field, str(data[field]).strip())

    db.session.commit()
    return jsonify(student.to_dict())

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    """Delete a student from the database."""
    student = Student.query.get(student_id)
    if student is None:
        return jsonify({'error': 'Student not found'}), 404

    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student deleted'})

@app.route('/api/students/<int:student_id>/subjects', methods=['GET'])
def list_subjects(student_id):
    """List subjects for a student."""
    student = Student.query.get(student_id)
    if student is None:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify([subject.to_dict() for subject in student.subjects])

@app.route('/api/students/<int:student_id>/subjects', methods=['POST'])
def create_subject(student_id):
    """Add a subject for a student."""
    student = Student.query.get(student_id)
    if student is None:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json() or {}
    required_subject_fields = ['subject_name', 'marks_obtained', 'max_marks']
    missing = [field for field in required_subject_fields if not str(data.get(field, '')).strip()]
    if missing:
        return jsonify({'error': 'Missing fields: ' + ', '.join(missing)}), 400

    try:
        marks_obtained = int(data['marks_obtained'])
        max_marks = int(data['max_marks'])
    except ValueError:
        return jsonify({'error': 'Marks must be whole numbers'}), 400

    subject = Subject(
        student_id=student.id,
        subject_name=data['subject_name'].strip(),
        marks_obtained=marks_obtained,
        max_marks=max_marks,
    )
    db.session.add(subject)
    db.session.commit()
    return jsonify(subject.to_dict()), 201

@app.route('/api/students/<int:student_id>/subjects/<int:subject_id>', methods=['PUT'])
def update_subject(student_id, subject_id):
    """Update a subject for a student."""
    subject = Subject.query.filter_by(id=subject_id, student_id=student_id).first()
    if subject is None:
        return jsonify({'error': 'Subject not found'}), 404

    data = request.get_json() or {}
    if 'subject_name' in data and str(data['subject_name']).strip():
        subject.subject_name = data['subject_name'].strip()
    if 'marks_obtained' in data and str(data['marks_obtained']).strip():
        try:
            subject.marks_obtained = int(data['marks_obtained'])
        except ValueError:
            return jsonify({'error': 'Marks obtained must be a number'}), 400
    if 'max_marks' in data and str(data['max_marks']).strip():
        try:
            subject.max_marks = int(data['max_marks'])
        except ValueError:
            return jsonify({'error': 'Max marks must be a number'}), 400

    db.session.commit()
    return jsonify(subject.to_dict())

@app.route('/api/students/<int:student_id>/subjects/<int:subject_id>', methods=['DELETE'])
def delete_subject(student_id, subject_id):
    """Delete a subject for a student."""
    subject = Subject.query.filter_by(id=subject_id, student_id=student_id).first()
    if subject is None:
        return jsonify({'error': 'Subject not found'}), 404

    db.session.delete(subject)
    db.session.commit()
    return jsonify({'message': 'Subject deleted'})

@app.route('/api/students/<int:student_id>/attendance', methods=['GET'])
def get_attendance(student_id):
    """Return attendance record for a student."""
    student = Student.query.get(student_id)
    if student is None:
        return jsonify({'error': 'Student not found'}), 404

    if student.attendance is None:
        return jsonify({'total_classes': 0, 'attended_classes': 0})
    return jsonify(student.attendance.to_dict())

@app.route('/api/students/<int:student_id>/attendance', methods=['PUT'])
def update_attendance(student_id):
    """Create or update attendance for a student."""
    student = Student.query.get(student_id)
    if student is None:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json() or {}
    required_attendance_fields = ['total_classes', 'attended_classes']
    missing = [field for field in required_attendance_fields if not str(data.get(field, '')).strip()]
    if missing:
        return jsonify({'error': 'Missing fields: ' + ', '.join(missing)}), 400

    try:
        total = int(data['total_classes'])
        attended = int(data['attended_classes'])
    except ValueError:
        return jsonify({'error': 'Attendance values must be whole numbers'}), 400

    if attended > total:
        return jsonify({'error': 'Attended classes cannot be greater than total classes'}), 400

    if student.attendance is None:
        attendance = Attendance(
            student_id=student.id,
            total_classes=total,
            attended_classes=attended,
        )
        db.session.add(attendance)
    else:
        student.attendance.total_classes = total
        student.attendance.attended_classes = attended

    db.session.commit()
    return jsonify(student.attendance.to_dict() if student.attendance else {
        'total_classes': total,
        'attended_classes': attended,
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
