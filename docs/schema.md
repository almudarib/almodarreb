1️⃣ جدول USERS (Profile مرتبط بـ Auth)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    auth_user_id UUID UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_auth
        FOREIGN KEY (auth_user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
);

2️⃣ جدول STUDENTS
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    auth_user_id UUID UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    language language_type NOT NULL,
    exam_datetime TIMESTAMP,
    start_date DATE,
    registration_date DATE DEFAULT CURRENT_DATE,
    last_login_at TIMESTAMP,
    notes TEXT,
    status student_status DEFAULT 'active',
    show_exams BOOLEAN DEFAULT TRUE,
    teacher_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_auth
        FOREIGN KEY (auth_user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_students_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES users(id)
);

3️⃣ جدول STUDENT_DEVICES
CREATE TABLE student_devices (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_devices_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE
);

4️⃣ جدول EXAMS
CREATE TABLE exams (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    language language_type NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

5️⃣ جدول EXAM_QUESTIONS
CREATE TABLE exam_questions (
    id BIGSERIAL PRIMARY KEY,
    exam_id BIGINT NOT NULL,
    question TEXT NOT NULL,
    image_url TEXT,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) CHECK (correct_option IN ('A','B','C','D')),
    CONSTRAINT fk_exam_questions_exam
        FOREIGN KEY (exam_id)
        REFERENCES exams(id)
        ON DELETE CASCADE
);

6️⃣ جدول EXAM_RESULTS
CREATE TABLE exam_results (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    duration_minutes INTEGER,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exam_results_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_exam_results_exam
        FOREIGN KEY (exam_id)
        REFERENCES exams(id)
);

7️⃣ جدول SESSIONS
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    video_url TEXT NOT NULL,
    language language_type NOT NULL,
    order_number INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

8️⃣ جدول STUDENT_SESSIONS
CREATE TABLE student_sessions (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    session_id BIGINT NOT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER CHECK (duration_minutes >= 0),
    CONSTRAINT fk_student_sessions_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_student_sessions_session
        FOREIGN KEY (session_id)
        REFERENCES sessions(id)
);

9️⃣ جدول STUDENT_ACTIONS (Audit Log)
CREATE TABLE student_actions (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    action_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_actions_student
        FOREIGN KEY (student_id)
        REFERENCES students(id),
    CONSTRAINT fk_student_actions_user
        FOREIGN KEY (action_by)
        REFERENCES users(id)
);

10️⃣ جدول ACCOUNTING
CREATE TABLE accounting (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status accounting_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounting_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES users(id),
    CONSTRAINT fk_accounting_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
);

11️⃣ جدول ROLES & PERMISSIONS (RBAC)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

12️⃣ تخزين جلسات الفيديو (Supabase Storage)

- اسم الـ bucket: session-videos (خاص)
- تنظيم المسارات: sessions/YYYY/MM/DD/<stamp>_<rand>_<filename>
- أمثلة:
  - فيديو مرفوع من الجهاز: storage://session-videos/sessions/2026/01/03/1735900000000_abcd1234_lesson1.mp4
  - بيانات وصفية JSON ملاصقة: storage://session-videos/sessions/2026/01/03/1735900000000_abcd1234_lesson1.json
  - مصدر يوتيوب: يتم رفع ملف JSON يحوي youtubeId والرابط الأصلي بنفس تنظيم التاريخ

البيانات الوصفية المخزّنة (JSON):
- source: 'upload' | 'youtube'
- youtubeId: عند مصدر يوتيوب، وإلا null
- originalUrl: الرابط الأصلي عند يوتيوب
- filename, contentType: عند الرفع من الجهاز
- sizeBytes: حجم الملف إن توفر
- durationSeconds: المدة إن توفرت (افتراضي null)
- createdAt: طابع زمني ISO

ملاحظات:
- احترام حدود الأحجام: الفيديو ≤ 500MB، المستندات ≤ 50MB
- روابط يوتيوب لا يُحمّل الفيديو نفسه، إنما يُحفظ مرجع JSON منظم بالتاريخ.
