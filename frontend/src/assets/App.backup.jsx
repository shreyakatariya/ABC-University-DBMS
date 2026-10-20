
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import './App.css';

const API = 'http://localhost:5000/api';

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Students', icon: GraduationCap },
  { label: 'Courses', icon: BookOpen },
  { label: 'Faculty', icon: Users },
  { label: 'Attendance', icon: CalendarDays },
  { label: 'Assessments', icon: BookOpen },
];

function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    year: 1,
    programId: 'P001',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);


  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState({
    studentId: '',
    courseId: 'C001',
  });
  const [enrollmentError, setEnrollmentError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState('');

  const [attendance, setAttendance] = useState([]);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    studentId: '',
    courseId: 'C001',
    date: new Date().toISOString().slice(0, 10),
    status: 'Present',
  });
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceMessage, setAttendanceMessage] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [assessments, setAssessments] = useState([]);
  const [performanceReport, setPerformanceReport] = useState([]);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentData, setAssessmentData] = useState({
    studentId: '',
    courseId: '',
    assessmentName: 'CAT 1',
    score: 0,
    maxScore: 20,
    date: new Date().toISOString().slice(0, 10),
  });
  const [assessmentError, setAssessmentError] = useState('');
  const [assessmentMessage, setAssessmentMessage] = useState('');
  const [savingAssessment, setSavingAssessment] = useState(false);



  async function getData(endpoint) {
    const response = await fetch(`${API}/${endpoint}`);

    if (!response.ok) {
      throw new Error(`Request failed: ${endpoint}`);
    }

    return response.json();
  }

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [
        dashboardData,
        studentData,
        courseData,
        facultyData,
        attendanceDataResult,
        assessmentDataResult,
        performanceData,
      ] = await Promise.all([
        getData('dashboard'),
        getData('students'),
        getData('courses'),
        getData('faculty'),
        getData('attendance'),
        getData('assessments'),
        getData('reports/performance'),
      ]);

      setDashboard(dashboardData);
      setStudents(studentData);
      setCourses(courseData);
      setFaculty(facultyData);
      setAttendance(attendanceDataResult);
      setAssessments(assessmentDataResult);
      setPerformanceReport(performanceData);
    } catch (err) {
      console.error(err);
      setError(
          'Unable to load university data. Check that the backend and Neo4j database are running.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSearch(value) {
    setSearch(value);

    if (activePage !== 'Students') return;

    try {
      const response = await getData(
          `students?search=${encodeURIComponent(value)}`
      );
      setStudents(response);
    } catch (err) {
      console.error('Student search failed:', err);
      setError('Could not search students. Please try again.');
    }
  }

  const pageDescriptions = {
    Dashboard: 'Here is what is happening at your university today.',
    Students: 'Manage and explore student records.',
    Courses: 'Explore courses and their enrollment details.',
    Faculty: 'View faculty members and their assigned courses.',
    Attendance: 'Record and review student attendance.',
    Assessments: 'Record marks and review student assessment results.',
  };

  const stats = [
    {
      label: 'Total Students',
      value: dashboard?.students,
      icon: GraduationCap,
      tone: 'violet',
      note: 'Registered in the system',
    },
    {
      label: 'Total Courses',
      value: dashboard?.courses,
      icon: BookOpen,
      tone: 'blue',
      note: 'Available courses',
    },
    {
      label: 'Faculty Members',
      value: dashboard?.faculty,
      icon: Users,
      tone: 'orange',
      note: 'Teaching staff',
    },
    {
      label: 'Enrollments',
      value: dashboard?.enrollments,
      icon: Activity,
      tone: 'green',
      note: 'Course registrations',
    },
  ];


  function openAddStudent() {
    setEditingStudent(null);
    setFormData({
      studentId: '',
      name: '',
      email: '',
      year: 1,
      programId: 'P001',
    });
    setFormError('');
    setShowStudentForm(true);
  }

  function openEditStudent(student) {
    setEditingStudent(student);
    setFormData({
      studentId: student.studentId,
      name: student.name || '',
      email: student.email || '',
      year: Number(student.year) || 1,
      programId: 'P001',
    });
    setFormError('');
    setShowStudentForm(true);
  }

  async function saveStudent(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const isEditing = Boolean(editingStudent);

      const url = isEditing
          ? `${API}/students/${encodeURIComponent(editingStudent.studentId)}`
          : `${API}/students`;

      const payload = isEditing
          ? {
            name: formData.name.trim(),
            email: formData.email.trim(),
            year: Number(formData.year),
          }
          : {
            studentId: formData.studentId.trim(),
            name: formData.name.trim(),
            email: formData.email.trim(),
            year: Number(formData.year),
            programId: formData.programId.trim(),
          };

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save student.');
      }

      setShowStudentForm(false);
      setEditingStudent(null);
      setSearch('');
      setActivePage('Students');

      await loadData();
    } catch (error) {
      setFormError(error.message || 'Could not save student.');
    } finally {
      setSaving(false);
    }
  }


  async function submitEnrollment(event) {
    event.preventDefault();
    setEnrolling(true);
    setEnrollmentError('');
    setEnrollmentMessage('');

    try {
      const response = await fetch(`${API}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: enrollmentData.studentId,
          courseId: enrollmentData.courseId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not enroll student.');
      }

      setShowEnrollmentForm(false);
      setEnrollmentMessage(
          `${result.studentName} is enrolled in ${result.courseName}.`
      );

      await loadData();
    } catch (error) {
      setEnrollmentError(error.message || 'Could not enroll student.');
    } finally {
      setEnrolling(false);
    }
  }


  async function submitAttendance(event) {
    event.preventDefault();
    setSavingAttendance(true);
    setAttendanceError('');
    setAttendanceMessage('');

    try {
      const response = await fetch(`${API}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...attendanceData,
          studentId: attendanceData.studentId.trim(),
          courseId: attendanceData.courseId.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save attendance.');
      }

      setAttendanceMessage(
          `Attendance saved: ${result.studentName} — ${result.status}`
      );

      setShowAttendanceForm(false);
      await loadData();
    } catch (error) {
      setAttendanceError(error.message || 'Could not save attendance.');
    } finally {
      setSavingAttendance(false);
    }
  }


  async function submitAssessment(event) {
    event.preventDefault();
    setSavingAssessment(true);
    setAssessmentError('');
    setAssessmentMessage('');

    try {
      const response = await fetch(`${API}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...assessmentData,
          studentId: assessmentData.studentId.trim(),
          courseId: assessmentData.courseId.trim(),
          assessmentName: assessmentData.assessmentName.trim(),
          score: Number(assessmentData.score),
          maxScore: Number(assessmentData.maxScore),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save assessment.');
      }

      setShowAssessmentForm(false);
      setAssessmentMessage(
          `Saved ${result.assessmentName}: ${result.score}/${result.maxScore} for ${result.studentName}.`
      );

      await loadData();
    } catch (error) {
      setAssessmentError(error.message || 'Could not save assessment.');
    } finally {
      setSavingAssessment(false);
    }
  }





  function renderTable() {
    if (activePage === 'Students') {
      return (
          <div className="table-scroll">
            <table>
              <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Program</th>
                <th>Year</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
              </thead>
              <tbody>
              {students.map((student) => (
                  <tr key={student.studentId}>
                    <td>
                      <div className="person-cell">
                        <div className="avatar">
                          {student.name?.charAt(0) || 'S'}
                        </div>
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td className="muted-cell">{student.studentId}</td>
                    <td>{student.program || '—'}</td>
                    <td>{student.year ?? '—'}</td>
                    <td>{student.email || '—'}</td>
                    <td>
                      <button
                          className="edit-button"
                          onClick={() => openEditStudent(student)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
            {!students.length && (
                <div className="empty-state">No students found.</div>
            )}
          </div>
      );
    }

    if (activePage === 'Courses') {
      return (
          <div className="table-scroll">
            <table>
              <thead>
              <tr>
                <th>Course</th>
                <th>Course ID</th>
                <th>Credits</th>
                <th>Faculty</th>
                <th>Enrollments</th>
              </tr>
              </thead>
              <tbody>
              {courses.map((course) => (
                  <tr key={course.courseId}>
                    <td>
                      <div className="course-cell">
                        <div className="course-icon">
                          <BookOpen size={17} />
                        </div>
                        <span>{course.name}</span>
                      </div>
                    </td>
                    <td className="muted-cell">{course.courseId}</td>
                    <td>{course.credits ?? '—'}</td>
                    <td>{course.faculty?.filter(Boolean).join(', ') || '—'}</td>
                    <td>
                    <span className="count-pill">
                      {course.enrollmentCount}
                    </span>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
            {!courses.length && (
                <div className="empty-state">No courses found.</div>
            )}
          </div>
      );
    }

    if (activePage === 'Faculty') {
      return (
          <div className="table-scroll">
            <table>
              <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Faculty ID</th>
                <th>Designation</th>
                <th>Courses</th>
              </tr>
              </thead>
              <tbody>
              {faculty.map((member) => (
                  <tr key={member.facultyId}>
                    <td>
                      <div className="person-cell">
                        <div className="avatar faculty-avatar">
                          {member.name?.charAt(0) || 'F'}
                        </div>
                        <span>{member.name}</span>
                      </div>
                    </td>
                    <td className="muted-cell">{member.facultyId}</td>
                    <td>{member.designation || '—'}</td>
                    <td>{member.courses?.filter(Boolean).join(', ') || '—'}</td>
                  </tr>
              ))}
              </tbody>
            </table>
            {!faculty.length && (
                <div className="empty-state">No faculty found.</div>
            )}
          </div>
      );
    }


    if (activePage === 'Attendance') {
      return (
          <div className="table-scroll">
            <table>
              <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Course</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
              </thead>
              <tbody>
              {attendance.map((record, index) => (
                  <tr
                      key={`${record.studentId}-${record.courseId}-${record.date}-${index}`}
                  >
                    <td>{record.studentName}</td>
                    <td className="muted-cell">{record.studentId}</td>
                    <td>{record.courseName}</td>
                    <td>{record.date}</td>
                    <td>
                <span className={`attendance-status ${record.status?.toLowerCase()}`}>
                  {record.status}
                </span>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
            {!attendance.length && (
                <div className="empty-state">
                  No attendance records found. Mark attendance to get started.
                </div>
            )}
          </div>
      );
    }


    if (activePage === 'Assessments') {
      return (
          <div className="table-scroll">
            <table>
              <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Assessment</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Date</th>
              </tr>
              </thead>
              <tbody>
              {assessments.map((record) => {
                const percentage =
                    record.maxScore > 0
                        ? (record.score / record.maxScore) * 100
                        : 0;

                return (
                    <tr
                        key={`${record.studentId}-${record.courseId}-${record.assessmentName}`}
                    >
                      <td>
                        <div className="person-cell">
                          <div className="avatar">
                            {record.studentName?.charAt(0) || 'S'}
                          </div>
                          <span>{record.studentName}</span>
                        </div>
                      </td>
                      <td>{record.courseName}</td>
                      <td>{record.assessmentName}</td>
                      <td>
                        {record.score} / {record.maxScore}
                      </td>
                      <td>
                  <span className="count-pill">
                    {percentage.toFixed(1)}%
                  </span>
                      </td>
                      <td>{record.date}</td>
                    </tr>
                );
              })}
              </tbody>
            </table>

            {!assessments.length && (
                <div className="empty-state">
                  No assessment records found. Add an assessment to get started.
                </div>
            )}
          </div>
      );
    }



    return (
        <div className="table-scroll">
          <table>
            <thead>
            <tr>
              <th>Student</th>
              <th>Student ID</th>
              <th>Program</th>
              <th>Year</th>
              <th>Email</th>
            </tr>
            </thead>
            <tbody>
            {students.slice(0, 5).map((student) => (
                <tr key={student.studentId}>
                  <td>
                    <div className="person-cell">
                      <div className="avatar">
                        {student.name?.charAt(0) || 'S'}
                      </div>
                      <span>{student.name}</span>
                    </div>
                  </td>
                  <td className="muted-cell">{student.studentId}</td>
                  <td>{student.program || '—'}</td>
                  <td>{student.year ?? '—'}</td>
                  <td>{student.email || '—'}</td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
    );
  }

  return (
      <div className="app-shell">
        {sidebarOpen && (
            <button
                className="mobile-backdrop"
                aria-label="Close navigation"
                onClick={() => setSidebarOpen(false)}
            />
        )}

        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="brand">
            <div className="brand-mark">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="brand-name">ABC University</div>
              <div className="brand-subtitle">ACADEMIC PORTAL</div>
            </div>
            <button
                className="icon-button mobile-close"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
            >
              <X size={19} />
            </button>
          </div>

          <div className="nav-caption">WORKSPACE</div>

          <nav className="navigation">
            {navigation.map(({ label, icon: Icon }) => (
                <button
                    key={label}
                    className={`nav-item ${activePage === label ? 'active' : ''}`}
                    onClick={() => {
                      setActivePage(label);
                      setSearch('');
                      setError('');
                      setSidebarOpen(false);
                    }}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{label}</span>
                  {label === 'Students' && (
                      <span className="nav-count">{dashboard?.students ?? '—'}</span>
                  )}
                </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="help-card">
              <div className="help-icon">
                <CircleHelp size={19} />
              </div>
              <div>
                <strong>Need assistance?</strong>
                <p>Academic portal support</p>
              </div>
            </div>
            <div className="profile">
              <div className="profile-avatar">AD</div>
              <div className="profile-info">
                <strong>Administrator</strong>
                <span>University Admin</span>
              </div>
              <ChevronDown size={16} className="profile-chevron" />
            </div>
          </div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <button
                className="icon-button mobile-menu"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-separator">/</span>
              <strong>{activePage}</strong>
            </div>

            <div className="topbar-actions">
              <div className="system-status">
                <span className="status-dot" />
                System operational
              </div>
              <button className="icon-button notification-button" aria-label="Notifications">
                <Bell size={19} />
                <span />
              </button>
              <div className="topbar-date">
                <CalendarDays size={17} />
                Academic year 2026–27
              </div>
            </div>
          </header>

          <div className="page-content">
            <section className="welcome-row">
              <div>
                <div className="eyebrow">ACADEMIC MANAGEMENT SYSTEM</div>
                <h1>{activePage === 'Dashboard' ? 'Overview' : activePage}</h1>
                <p>{pageDescriptions[activePage]}</p>
              </div>
              <button
                  className="refresh-button"
                  onClick={loadData}
                  disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'spin' : ''} />
                Refresh data
              </button>
            </section>


            {enrollmentMessage && (
                <div className="success-banner">
                  <span>{enrollmentMessage}</span>
                  <button
                      onClick={() => setEnrollmentMessage('')}
                      aria-label="Dismiss message"
                  >
                    <X size={15} />
                  </button>
                </div>
            )}

            {attendanceMessage && (
                <div className="success-banner">
                  <span>{attendanceMessage}</span>
                  <button
                      onClick={() => setAttendanceMessage('')}
                      aria-label="Dismiss message"
                  >
                    <X size={15} />
                  </button>
                </div>
            )}

            {assessmentMessage && (
                <div className="success-banner">
                  <span>{assessmentMessage}</span>
                  <button
                      onClick={() => setAssessmentMessage('')}
                      aria-label="Dismiss message"
                  >
                    <X size={15} />
                  </button>
                </div>
            )}


            {error && (
                <div className="error-banner">
                  <Activity size={18} />
                  <span>{error}</span>
                  <button onClick={loadData}>Retry</button>
                </div>
            )}

            {activePage === 'Dashboard' && (
                <>
                  <section className="stats-grid">
                    {stats.map(({ label, value, icon: Icon, tone, note }, index) => (
                        <article className="stat-card" key={label}>
                          <div className="stat-top">
                            <div className={`stat-icon ${tone}`}>
                              <Icon size={21} />
                            </div>
                            <span className="stat-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                          </div>
                          <div className="stat-label">{label}</div>
                          <div className="stat-value">
                            {loading ? '—' : (value ?? 0).toLocaleString()}
                          </div>
                          <div className="stat-note">
                            <span className="note-dot" />
                            {note}
                          </div>
                        </article>
                    ))}
                  </section>

                  <section className="insight-grid">
                    <article className="panel welcome-panel">
                      <div className="welcome-panel-content">
                        <div className="panel-eyebrow">YOUR UNIVERSITY AT A GLANCE</div>
                        <h2>Every connection<br />tells a story.</h2>
                        <p>
                          Explore the relationships between students, courses and
                          faculty in your university's academic network.
                        </p>
                        <button
                            className="primary-button"
                            onClick={() => setActivePage('Students')}
                        >
                          Explore students <ArrowUpRight size={17} />
                        </button>
                      </div>
                      <div className="orb orb-one" />
                      <div className="orb orb-two" />
                      <div className="network-art" aria-hidden="true">
                        <span className="network-line line-one" />
                        <span className="network-line line-two" />
                        <span className="network-line line-three" />
                        <span className="network-node node-one"><Users size={18} /></span>
                        <span className="network-node node-two"><BookOpen size={18} /></span>
                        <span className="network-node node-three"><GraduationCap size={18} /></span>
                        <span className="network-node node-four"><Activity size={16} /></span>
                      </div>
                    </article>

                    <article className="panel quick-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Quick navigation</h3>
                          <p>Go directly to a section</p>
                        </div>
                      </div>
                      {navigation.slice(1).map(({ label, icon: Icon }, index) => (
                          <button
                              key={label}
                              className="quick-link"
                              onClick={() => setActivePage(label)}
                          >
                            <div className={`quick-icon quick-${index}`}>
                              <Icon size={19} />
                            </div>
                            <div className="quick-copy">
                              <strong>{label}</strong>
                              <span>
                          {label === 'Students' && `${dashboard?.students ?? 0} records`}
                                {label === 'Courses' && `${dashboard?.courses ?? 0} courses`}
                                {label === 'Faculty' && `${dashboard?.faculty ?? 0} members`}
                        </span>
                            </div>
                            <ArrowUpRight size={17} className="quick-arrow" />
                          </button>
                      ))}
                    </article>
                  </section>

                  <section className="panel records-panel">
                    <div className="records-heading">
                      <div>
                        <div className="panel-eyebrow">ACADEMIC PERFORMANCE</div>
                        <h3>Student performance report</h3>
                        <p>Assessment totals grouped by student and course, calculated by Neo4j.</p>
                      </div>
                    </div>
                    {performanceReport.length ? (
                        <div className="table-scroll">
                          <table>
                            <thead>
                            <tr>
                              <th>Student</th>
                              <th>Course</th>
                              <th>Assessments</th>
                              <th>Total score</th>
                              <th>Maximum score</th>
                              <th>Percentage</th>
                            </tr>
                            </thead>
                            <tbody>
                            {performanceReport.map((record, index) => (
                                <tr key={`${record.studentId || record.studentName}-${record.courseId || record.courseName}-${index}`}>
                                  <td>{record.studentName || '—'}</td>
                                  <td>{record.courseName || '—'}</td>
                                  <td><span className="count-pill">{record.assessmentCount ?? 0}</span></td>
                                  <td>{record.totalScore ?? 0}</td>
                                  <td>{record.totalPossible ?? 0}</td>
                                  <td><span className="count-pill">{record.percentage == null ? '—' : `${Number(record.percentage).toFixed(1)}%`}</span></td>
                                </tr>
                            ))}
                            </tbody>
                          </table>
                        </div>
                    ) : (
                        <div className="empty-state">No linked assessment performance records found.</div>
                    )}
                  </section>
                </>
            )}

            <section className="panel records-panel">
              <div className="records-heading">
                <div>
                  <div className="panel-eyebrow">
                    {activePage === 'Dashboard' ? 'UNIVERSITY DIRECTORY' : 'RECORD MANAGEMENT'}
                  </div>
                  <h3>
                    {activePage === 'Dashboard' ? 'Recently registered students' : `${activePage} directory`}
                  </h3>
                  <p>
                    {activePage === 'Dashboard'
                        ? 'A quick look at student records in your system.'
                        : `Browse ${activePage.toLowerCase()} connected to the university graph.`}
                  </p>
                </div>


                {activePage === 'Students' && (
                    <div className="student-actions">
                      <div className="table-search">
                        <Search size={16} />
                        <input
                            value={search}
                            onChange={(event) => handleSearch(event.target.value)}
                            placeholder="Search students..."
                            aria-label="Search students"
                        />
                        {search && (
                            <button
                                className="clear-search"
                                onClick={() => handleSearch('')}
                                aria-label="Clear search"
                            >
                              <X size={14} />
                            </button>
                        )}
                      </div>

                      <button className="add-button" onClick={openAddStudent}>
                        <span>+</span> Add Student
                      </button>
                    </div>
                )}


                {activePage === 'Courses' && (
                    <button
                        className="add-button"
                        onClick={() => {
                          setEnrollmentData({
                            studentId: students[0]?.studentId || '',
                            courseId: courses[0]?.courseId || '',
                          });
                          setEnrollmentError('');
                          setEnrollmentMessage('');
                          setShowEnrollmentForm(true);
                        }}
                        disabled={!students.length || !courses.length}
                    >
                      <span>+</span> Enroll Student
                    </button>
                )}


                {activePage === 'Attendance' && (
                    <button
                        className="add-button"
                        onClick={() => {
                          setAttendanceData({
                            studentId: students[0]?.studentId || '',
                            courseId: courses[0]?.courseId || '',
                            date: new Date().toISOString().slice(0, 10),
                            status: 'Present',
                          });
                          setAttendanceError('');
                          setAttendanceMessage('');
                          setShowAttendanceForm(true);
                        }}
                        disabled={!students.length || !courses.length}
                    >
                      <span>+</span> Mark Attendance
                    </button>
                )}


                {activePage === 'Assessments' && (
                    <button
                        className="add-button"
                        onClick={() => {
                          setAssessmentData({
                            studentId: students[0]?.studentId || '',
                            courseId: courses[0]?.courseId || '',
                            assessmentName: 'CAT 1',
                            score: 0,
                            maxScore: 20,
                            date: new Date().toISOString().slice(0, 10),
                          });
                          setAssessmentError('');
                          setAssessmentMessage('');
                          setShowAssessmentForm(true);
                        }}
                        disabled={!students.length || !courses.length}
                    >
                      <span>+</span> Add Assessment
                    </button>
                )}





                {activePage === 'Dashboard' && (
                    <button
                        className="text-button"
                        onClick={() => setActivePage('Students')}
                    >
                      View all students <ArrowUpRight size={16} />
                    </button>
                )}
              </div>

              {loading ? (
                  <div className="empty-state">Loading university records…</div>
              ) : (
                  renderTable()
              )}

              {activePage === 'Dashboard' && !loading && (
                  <div className="table-footer">
                    <span>Showing {Math.min(students.length, 5)} of {students.length} students</span>
                    <button onClick={() => setActivePage('Students')}>
                      Browse directory <ArrowUpRight size={15} />
                    </button>
                  </div>
              )}
            </section>


            {showStudentForm && (
                <div className="modal-backdrop">
                  <section
                      className="student-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="student-form-title"
                  >
                    <div className="modal-heading">
                      <div>
                        <div className="panel-eyebrow">STUDENT RECORD</div>
                        <h2 id="student-form-title">
                          {editingStudent ? 'Edit student' : 'Add a student'}
                        </h2>
                        <p>
                          {editingStudent
                              ? 'Update the student details below.'
                              : 'Enter the new student details.'}
                        </p>
                      </div>
                      <button
                          type="button"
                          className="icon-button"
                          onClick={() => setShowStudentForm(false)}
                          aria-label="Close form"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={saveStudent}>
                      {!editingStudent && (
                          <label className="form-field">
                            Student ID
                            <input
                                required
                                value={formData.studentId}
                                onChange={(e) =>
                                    setFormData({ ...formData, studentId: e.target.value })
                                }
                                placeholder="e.g. S004"
                            />
                          </label>
                      )}

                      <label className="form-field">
                        Full name
                        <input
                            required
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="Enter student's name"
                        />
                      </label>

                      <label className="form-field">
                        Email address
                        <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                            }
                            placeholder="student@example.com"
                        />
                      </label>

                      <label className="form-field">
                        Year of study
                        <select
                            value={formData.year}
                            onChange={(e) =>
                                setFormData({ ...formData, year: Number(e.target.value) })
                            }
                        >
                          {[1, 2, 3, 4, 5].map((year) => (
                              <option key={year} value={year}>
                                Year {year}
                              </option>
                          ))}
                        </select>
                      </label>

                      {!editingStudent && (
                          <label className="form-field">
                            Program ID
                            <input
                                required
                                value={formData.programId}
                                onChange={(e) =>
                                    setFormData({ ...formData, programId: e.target.value })
                                }
                                placeholder="P001"
                            />
                            <span className="field-hint">
              Use an existing program ID in Neo4j, such as P001.
            </span>
                          </label>
                      )}

                      {formError && <div className="form-error">{formError}</div>}

                      <div className="modal-actions">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => setShowStudentForm(false)}
                        >
                          Cancel
                        </button>
                        <button className="add-button" type="submit" disabled={saving}>
                          {saving
                              ? 'Saving...'
                              : editingStudent
                                  ? 'Save changes'
                                  : 'Create student'}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
            )}


            {showEnrollmentForm && (
                <div className="modal-backdrop">
                  <section
                      className="student-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="enrollment-form-title"
                  >
                    <div className="modal-heading">
                      <div>
                        <div className="panel-eyebrow">COURSE REGISTRATION</div>
                        <h2 id="enrollment-form-title">Enroll a student</h2>
                        <p>Choose a student and a course to create an enrollment.</p>
                      </div>
                      <button
                          type="button"
                          className="icon-button"
                          onClick={() => setShowEnrollmentForm(false)}
                          aria-label="Close enrollment form"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={submitEnrollment}>
                      <label className="form-field">
                        Student
                        <select
                            required
                            value={enrollmentData.studentId}
                            onChange={(e) =>
                                setEnrollmentData({
                                  ...enrollmentData,
                                  studentId: e.target.value,
                                })
                            }
                        >
                          <option value="" disabled>Select a student</option>
                          {students.map((student) => (
                              <option key={student.studentId} value={student.studentId}>
                                {student.name} ({student.studentId})
                              </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-field">
                        Course
                        <select
                            required
                            value={enrollmentData.courseId}
                            onChange={(e) =>
                                setEnrollmentData({
                                  ...enrollmentData,
                                  courseId: e.target.value,
                                })
                            }
                        >
                          <option value="" disabled>Select a course</option>
                          {courses.map((course) => (
                              <option key={course.courseId} value={course.courseId}>
                                {course.name} ({course.courseId})
                              </option>
                          ))}
                        </select>
                      </label>

                      {enrollmentError && (
                          <div className="form-error">{enrollmentError}</div>
                      )}

                      <div className="modal-actions">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => setShowEnrollmentForm(false)}
                        >
                          Cancel
                        </button>
                        <button className="add-button" type="submit" disabled={enrolling}>
                          {enrolling ? 'Enrolling...' : 'Confirm enrollment'}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
            )}


            {showAttendanceForm && (
                <div className="modal-backdrop">
                  <section
                      className="student-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="attendance-form-title"
                  >
                    <div className="modal-heading">
                      <div>
                        <div className="panel-eyebrow">ATTENDANCE MANAGEMENT</div>
                        <h2 id="attendance-form-title">Mark attendance</h2>
                        <p>Record a student's attendance for a course and date.</p>
                      </div>
                      <button
                          type="button"
                          className="icon-button"
                          onClick={() => setShowAttendanceForm(false)}
                          aria-label="Close form"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={submitAttendance}>
                      <label className="form-field">
                        Student
                        <select
                            required
                            value={attendanceData.studentId}
                            onChange={(e) =>
                                setAttendanceData({
                                  ...attendanceData,
                                  studentId: e.target.value,
                                })
                            }
                        >
                          <option value="" disabled>Select a student</option>
                          {students.map((student) => (
                              <option key={student.studentId} value={student.studentId}>
                                {student.name} ({student.studentId})
                              </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-field">
                        Course
                        <select
                            required
                            value={attendanceData.courseId}
                            onChange={(e) =>
                                setAttendanceData({
                                  ...attendanceData,
                                  courseId: e.target.value,
                                })
                            }
                        >
                          <option value="" disabled>Select a course</option>
                          {courses.map((course) => (
                              <option key={course.courseId} value={course.courseId}>
                                {course.name} ({course.courseId})
                              </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-field">
                        Attendance date
                        <input
                            type="date"
                            required
                            value={attendanceData.date}
                            onChange={(e) =>
                                setAttendanceData({
                                  ...attendanceData,
                                  date: e.target.value,
                                })
                            }
                        />
                      </label>

                      <label className="form-field">
                        Status
                        <select
                            value={attendanceData.status}
                            onChange={(e) =>
                                setAttendanceData({
                                  ...attendanceData,
                                  status: e.target.value,
                                })
                            }
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      </label>

                      {attendanceError && (
                          <div className="form-error">{attendanceError}</div>
                      )}

                      <div className="modal-actions">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => setShowAttendanceForm(false)}
                        >
                          Cancel
                        </button>
                        <button className="add-button" type="submit" disabled={savingAttendance}>
                          {savingAttendance ? 'Saving...' : 'Save attendance'}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
            )}


            {showAssessmentForm && (
                <div className="modal-backdrop">
                  <section
                      className="student-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="assessment-form-title"
                  >
                    <div className="modal-heading">
                      <div>
                        <div className="panel-eyebrow">ACADEMIC PERFORMANCE</div>
                        <h2 id="assessment-form-title">Add assessment</h2>
                        <p>Record a student's score for a course assessment.</p>
                      </div>
                      <button
                          type="button"
                          className="icon-button"
                          onClick={() => setShowAssessmentForm(false)}
                          aria-label="Close form"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={submitAssessment}>
                      <label className="form-field">
                        Student
                        <select
                            required
                            value={assessmentData.studentId}
                            onChange={(e) =>
                                setAssessmentData({
                                  ...assessmentData,
                                  studentId: e.target.value,
                                })
                            }
                        >
                          <option value="" disabled>Select a student</option>
                          {students.map((student) => (
                              <option key={student.studentId} value={student.studentId}>
                                {student.name} ({student.studentId})
                              </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-field">
                        Course
                        <select
                            required
                            value={assessmentData.courseId}
                            onChange={(e) =>
                                setAssessmentData({
                                  ...assessmentData,
                                  courseId: e.target.value,
                                })
                            }
                        >
                          <option value="" disabled>Select a course</option>
                          {courses.map((course) => (
                              <option key={course.courseId} value={course.courseId}>
                                {course.name} ({course.courseId})
                              </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-field">
                        Assessment name
                        <select
                            value={assessmentData.assessmentName}
                            onChange={(e) =>
                                setAssessmentData({
                                  ...assessmentData,
                                  assessmentName: e.target.value,
                                })
                            }
                        >
                          <option value="CAT 1">CAT 1</option>
                          <option value="CAT 2">CAT 2</option>
                          <option value="FAT">FAT</option>
                          <option value="Assignment">Assignment</option>
                          <option value="Quiz">Quiz</option>
                          <option value="Lab">Lab</option>
                        </select>
                      </label>

                      <div className="form-row">
                        <label className="form-field">
                          Score obtained
                          <input
                              type="number"
                              required
                              min="0"
                              step="0.5"
                              value={assessmentData.score}
                              onChange={(e) =>
                                  setAssessmentData({
                                    ...assessmentData,
                                    score: e.target.value,
                                  })
                              }
                          />
                        </label>

                        <label className="form-field">
                          Maximum marks
                          <input
                              type="number"
                              required
                              min="0.5"
                              step="0.5"
                              value={assessmentData.maxScore}
                              onChange={(e) =>
                                  setAssessmentData({
                                    ...assessmentData,
                                    maxScore: e.target.value,
                                  })
                              }
                          />
                        </label>
                      </div>

                      <label className="form-field">
                        Assessment date
                        <input
                            type="date"
                            required
                            value={assessmentData.date}
                            onChange={(e) =>
                                setAssessmentData({
                                  ...assessmentData,
                                  date: e.target.value,
                                })
                            }
                        />
                      </label>

                      {assessmentError && (
                          <div className="form-error">{assessmentError}</div>
                      )}

                      <div className="modal-actions">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => setShowAssessmentForm(false)}
                        >
                          Cancel
                        </button>
                        <button
                            className="add-button"
                            type="submit"
                            disabled={savingAssessment}
                        >
                          {savingAssessment ? 'Saving...' : 'Save assessment'}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
            )}





            <footer className="page-footer">
              <span>© 2026 ABC University · Academic Management System</span>
              <span><span className="footer-status" /> Connected to Neo4j</span>
            </footer>
          </div>
        </main>
      </div>
  );
}

export default App;
