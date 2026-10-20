require('dotenv').config();

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();

app.use(cors());
app.use(express.json());

const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
const DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
    throw new Error('Missing Neo4j credentials in .env');
}

const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);

// Convert Neo4j integer values to ordinary JavaScript numbers.
function normalize(value) {
    if (neo4j.isInt(value)) return value.toNumber();

    if (Array.isArray(value)) {
        return value.map(normalize);
    }

    if (value && typeof value === 'object') {
        const result = {};

        for (const [key, item] of Object.entries(value)) {
            result[key] = normalize(item);
        }

        return result;
    }

    return value;
}

async function query(cypher, params = {}) {
    const result = await driver.executeQuery(
        cypher,
        params,
        { database: DATABASE }
    );

    return result.records.map(record => normalize(record.toObject()));
}

app.get('/', (req, res) => {
    res.json({
        message: 'ABC University Academic Management API is running'
    });
});

app.get('/api/health', async (req, res) => {
    try {
        await driver.verifyConnectivity();

        const rows = await query(
            'RETURN "Connected to Neo4j successfully!" AS message'
        );

        res.json({
            status: 'success',
            message: rows[0].message
        });
    } catch (error) {
        console.error('Health check failed:', error.message);

        res.status(500).json({
            status: 'error',
            message: 'Database connection failed'
        });
    }
});


app.get('/api/students', async (req, res) => {
    try {
        const search = String(req.query.search || '').trim();

        const result = await driver.executeQuery(
            `
      MATCH (s:Student)
      WHERE toLower(s.name) CONTAINS toLower($search)
         OR toLower(s.studentId) CONTAINS toLower($search)
      OPTIONAL MATCH (p:Program)-[:HAS_STUDENT]->(s)
      RETURN s.studentId AS studentId,
             s.name AS name,
             s.email AS email,
             s.year AS year,
             p.name AS program
      ORDER BY name
      `,
            { search },
            { database: DATABASE }
        );

        res.json(
            result.records.map(record => ({
                studentId: record.get('studentId'),
                name: record.get('name'),
                email: record.get('email'),
                year: record.get('year') === null
                    ? null
                    : neo4j.isInt(record.get('year'))
                        ? record.get('year').toNumber()
                        : record.get('year'),
                program: record.get('program')
            }))
        );
    } catch (error) {
        console.error('Students route error:', error.message);
        res.status(500).json({ error: 'Could not load students.' });
    }
});


function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

// Dashboard totals
app.get('/api/dashboard', async (req, res) => {
    try {
        const rows = await query(`
      CALL {
        MATCH (s:Student)
        RETURN count(s) AS students
      }
      CALL {
        MATCH (c:Course)
        RETURN count(c) AS courses
      }
      CALL {
        MATCH (f:Faculty)
        RETURN count(f) AS faculty
      }
      CALL {
        MATCH ()-[r:ENROLLED_IN]->()
        RETURN count(r) AS enrollments
      }
      RETURN students, courses, faculty, enrollments
    `);

        res.json(rows[0]);
    } catch (error) {
        console.error('Dashboard error:', error.message);
        res.status(500).json({ error: 'Could not load dashboard' });
    }
});

// Create a student and link them to an existing program
app.post('/api/students', async (req, res) => {
    const { studentId, name, email, year, programId } = req.body;

    if (
        !isNonEmptyString(studentId) ||
        !isNonEmptyString(name) ||
        !isNonEmptyString(email) ||
        !isNonEmptyString(programId) ||
        !Number.isInteger(year) ||
        year < 1 ||
        year > 5
    ) {
        return res.status(400).json({
            error: 'Provide studentId, name, email, programId, and a year from 1 to 5.'
        });
    }

    try {
        const rows = await query(`
      MATCH (p:Program {programId: $programId})
      CREATE (s:Student {
        studentId: $studentId,
        name: $name,
        email: $email,
        year: $year
      })
      CREATE (p)-[:HAS_STUDENT]->(s)
      RETURN s.studentId AS studentId,
             s.name AS name,
             s.email AS email,
             s.year AS year,
             p.name AS program
    `, {
            studentId: studentId.trim(),
            name: name.trim(),
            email: email.trim(),
            year,
            programId: programId.trim()
        });

        if (!rows.length) {
            return res.status(400).json({
                error: 'Program not found. Use an existing program ID.'
            });
        }

        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
            return res.status(409).json({
                error: 'A student with this ID already exists.'
            });
        }

        console.error('Create student error:', error.message);
        res.status(500).json({ error: 'Could not create student.' });
    }
});

// Update a student's basic details
app.put('/api/students/:studentId', async (req, res) => {
    const { name, email, year } = req.body;

    if (
        !isNonEmptyString(name) ||
        !isNonEmptyString(email) ||
        !Number.isInteger(year) ||
        year < 1 ||
        year > 5
    ) {
        return res.status(400).json({
            error: 'Provide a name, email, and a year from 1 to 5.'
        });
    }

    try {
        const rows = await query(`
      MATCH (s:Student {studentId: $studentId})
      SET s.name = $name,
          s.email = $email,
          s.year = $year
      OPTIONAL MATCH (p:Program)-[:HAS_STUDENT]->(s)
      RETURN s.studentId AS studentId,
             s.name AS name,
             s.email AS email,
             s.year AS year,
             p.name AS program
    `, {
            studentId: req.params.studentId,
            name: name.trim(),
            email: email.trim(),
            year
        });

        if (!rows.length) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Update student error:', error.message);
        res.status(500).json({ error: 'Could not update student.' });
    }
});


// List courses, instructors, and enrollment totals
app.get('/api/courses', async (req, res) => {
    try {
        const rows = await query(`
      MATCH (c:Course)
      OPTIONAL MATCH (f:Faculty)-[:TEACHES]->(c)
      OPTIONAL MATCH (:Student)-[r:ENROLLED_IN]->(c)
      RETURN c.courseId AS courseId,
             c.name AS name,
             c.credits AS credits,
             collect(DISTINCT f.name) AS faculty,
             count(DISTINCT r) AS enrollmentCount
      ORDER BY name
    `);

        res.json(rows);
    } catch (error) {
        console.error('Courses error:', error.message);
        res.status(500).json({ error: 'Could not load courses' });
    }
});

// List faculty and the courses they teach
app.get('/api/faculty', async (req, res) => {
    try {
        const rows = await query(`
      MATCH (f:Faculty)
      OPTIONAL MATCH (f)-[:TEACHES]->(c:Course)
      RETURN f.facultyId AS facultyId,
             f.name AS name,
             f.designation AS designation,
             collect(DISTINCT c.name) AS courses
      ORDER BY name
    `);

        res.json(rows);
    } catch (error) {
        console.error('Faculty error:', error.message);
        res.status(500).json({ error: 'Could not load faculty' });
    }
});


// Create a faculty member
app.post('/api/faculty', async (req, res) => {
    const { facultyId, name, designation } = req.body;

    if (
        !isNonEmptyString(facultyId) ||
        !isNonEmptyString(name) ||
        !isNonEmptyString(designation)
    ) {
        return res.status(400).json({
            error: 'Provide facultyId, name, and designation.'
        });
    }

    try {
        const existing = await query(`
            MATCH (f:Faculty {facultyId: $facultyId})
            RETURN f.facultyId AS facultyId
        `, { facultyId: facultyId.trim() });

        if (existing.length) {
            return res.status(409).json({
                error: 'A faculty member with this ID already exists.'
            });
        }

        const rows = await query(`
            CREATE (f:Faculty {
                facultyId: $facultyId,
                name: $name,
                designation: $designation
            })
            RETURN f.facultyId AS facultyId,
                   f.name AS name,
                   f.designation AS designation
        `, {
            facultyId: facultyId.trim(),
            name: name.trim(),
            designation: designation.trim()
        });

        return res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
            return res.status(409).json({
                error: 'A faculty member with this ID already exists.'
            });
        }

        console.error('Create faculty error:', error.message);
        return res.status(500).json({ error: 'Could not create faculty member.' });
    }
});


app.put('/api/faculty/:facultyId', async (req, res) => {
    try {
        const { facultyId } = req.params;
        const { name, designation } = req.body;

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof designation !== 'string' ||
            !designation.trim()
        ) {
            return res.status(400).json({
                error: 'Name and designation are required.'
            });
        }

        const rows = await query(`
            MATCH (f:Faculty {facultyId: $facultyId})
            SET f.name = $name,
                f.designation = $designation
            RETURN
                f.facultyId AS facultyId,
                f.name AS name,
                f.designation AS designation
        `, {
            facultyId,
            name: name.trim(),
            designation: designation.trim()
        });

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Faculty member not found.'
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Faculty update error:', error.message);
        res.status(500).json({
            error: 'Could not update faculty.'
        });
    }
});


app.post('/api/enrollments', async (req, res) => {
    const { studentId, courseId } = req.body;

    if (
        typeof studentId !== 'string' ||
        !studentId.trim() ||
        typeof courseId !== 'string' ||
        !courseId.trim()
    ) {
        return res.status(400).json({
            error: 'Student ID and course ID are required.'
        });
    }

    try {
        const result = await driver.executeQuery(
            `
      MATCH (s:Student {studentId: $studentId})
      MATCH (c:Course {courseId: $courseId})
      MERGE (s)-[r:ENROLLED_IN]->(c)
      ON CREATE SET r.enrolledAt = date()
      RETURN s.studentId AS studentId,
             s.name AS studentName,
             c.courseId AS courseId,
             c.name AS courseName
      `,
            {
                studentId: studentId.trim(),
                courseId: courseId.trim()
            },
            { database: DATABASE }
        );

        if (result.records.length === 0) {
            return res.status(404).json({
                error: 'Student or course not found. Check both IDs.'
            });
        }

        const record = result.records[0];

        res.status(200).json({
            message: 'Enrollment confirmed.',
            studentId: record.get('studentId'),
            studentName: record.get('studentName'),
            courseId: record.get('courseId'),
            courseName: record.get('courseName')
        });
    } catch (error) {
        console.error('Enrollment error:', error.message);
        res.status(500).json({
            error: 'Could not create enrollment.'
        });
    }
});


app.get('/api/attendance', async (req, res) => {
    try {
        const rows = await query(`
      MATCH (s:Student)-[:HAS_ATTENDANCE]->(a:Attendance)
            -[:FOR_COURSE]->(c:Course)
      RETURN s.studentId AS studentId,
             s.name AS studentName,
             c.courseId AS courseId,
             c.name AS courseName,
             toString(a.date) AS date,
             a.status AS status
      ORDER BY date DESC, studentName
    `);

        res.json(rows);
    } catch (error) {
        console.error('Attendance list error:', error.message);
        res.status(500).json({
            error: 'Could not load attendance records.'
        });
    }
});

app.post('/api/attendance', async (req, res) => {
    const { studentId, courseId, date, status } = req.body;

    const validStatuses = ['Present', 'Absent', 'Late'];

    if (
        typeof studentId !== 'string' || !studentId.trim() ||
        typeof courseId !== 'string' || !courseId.trim() ||
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !validStatuses.includes(status)
    ) {
        return res.status(400).json({
            error: 'Provide studentId, courseId, a valid YYYY-MM-DD date, and status Present, Absent, or Late.'
        });
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
    ) {
        return res.status(400).json({
            error: 'The attendance date is invalid.'
        });
    }

    try {
        const rows = await query(`
      MATCH (s:Student {studentId: $studentId})
      MATCH (c:Course {courseId: $courseId})
      WITH s, c, date($date) AS attendanceDate
      MERGE (a:Attendance {
        studentId: s.studentId,
        courseId: c.courseId,
        date: attendanceDate
      })
      ON CREATE SET a.status = $status
      ON MATCH SET a.status = $status
      MERGE (s)-[:HAS_ATTENDANCE]->(a)
      MERGE (a)-[:FOR_COURSE]->(c)
      RETURN s.studentId AS studentId,
             s.name AS studentName,
             c.courseId AS courseId,
             c.name AS courseName,
             toString(a.date) AS date,
             a.status AS status
    `, {
            studentId: studentId.trim(),
            courseId: courseId.trim(),
            date,
            status
        });

        if (!rows.length) {
            return res.status(404).json({
                error: 'Student or course not found. Check both IDs.'
            });
        }

        res.status(200).json({
            message: 'Attendance saved successfully.',
            ...rows[0]
        });
    } catch (error) {
        console.error('Save attendance error:', error.message);
        res.status(500).json({
            error: 'Could not save attendance.'
        });
    }
});


app.get('/api/assessments', async (req, res) => {
    try {
        const rows = await query(`
      MATCH (s:Student)-[:HAS_ASSESSMENT]->(a:Assessment)
            -[:FOR_COURSE]->(c:Course)
      RETURN s.studentId AS studentId,
             s.name AS studentName,
             c.courseId AS courseId,
             c.name AS courseName,
             a.assessmentName AS assessmentName,
             a.score AS score,
             a.maxScore AS maxScore,
             toString(a.date) AS date
      ORDER BY date DESC, studentName, assessmentName
    `);

        res.json(rows);
    } catch (error) {
        console.error('Assessment list error:', error.message);
        res.status(500).json({
            error: 'Could not load assessments.'
        });
    }
});


app.get('/api/reports/performance', async (req, res) => {
    try {
        const rows = await query(`
            MATCH (s:Student)-[:HAS_ASSESSMENT]->(a:Assessment)
                  -[:FOR_COURSE]->(c:Course)
            WITH s, c,
                 count(a) AS assessmentCount,
                 sum(a.score) AS totalScore,
                 sum(a.maxScore) AS totalPossible
            RETURN
                s.studentId AS studentId,
                s.name AS studentName,
                c.courseId AS courseId,
                c.name AS courseName,
                assessmentCount,
                totalScore,
                totalPossible,
                CASE
                    WHEN totalPossible > 0
                    THEN round(100.0 * totalScore / totalPossible, 2)
                    ELSE null
                END AS percentage
            ORDER BY studentName, courseName
        `);

        res.json(rows);
    } catch (error) {
        console.error('Performance report error:', error.message);
        res.status(500).json({
            error: 'Could not load performance report.'
        });
    }
});


app.post('/api/assessments', async (req, res) => {
    const {
        studentId,
        courseId,
        assessmentName,
        score,
        maxScore,
        date
    } = req.body;

    const validDate =
        typeof date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        !Number.isNaN(new Date(`${date}T00:00:00Z`).getTime()) &&
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

    if (
        typeof studentId !== 'string' || !studentId.trim() ||
        typeof courseId !== 'string' || !courseId.trim() ||
        typeof assessmentName !== 'string' || !assessmentName.trim() ||
        typeof score !== 'number' || !Number.isFinite(score) ||
        typeof maxScore !== 'number' || !Number.isFinite(maxScore) ||
        maxScore <= 0 || score < 0 || score > maxScore ||
        !validDate
    ) {
        return res.status(400).json({
            error: 'Provide studentId, courseId, assessmentName, a valid date, and numeric scores where 0 <= score <= maxScore.'
        });
    }

    try {
        const rows = await query(`
      MATCH (s:Student {studentId: $studentId})
      MATCH (c:Course {courseId: $courseId})
      WITH s, c, date($date) AS assessmentDate
      MERGE (a:Assessment {
        studentId: s.studentId,
        courseId: c.courseId,
        assessmentName: $assessmentName
      })
      SET a.score = $score,
          a.maxScore = $maxScore,
          a.date = assessmentDate
      MERGE (s)-[:HAS_ASSESSMENT]->(a)
      MERGE (a)-[:FOR_COURSE]->(c)
      RETURN s.studentId AS studentId,
             s.name AS studentName,
             c.courseId AS courseId,
             c.name AS courseName,
             a.assessmentName AS assessmentName,
             a.score AS score,
             a.maxScore AS maxScore,
             toString(a.date) AS date
    `, {
            studentId: studentId.trim(),
            courseId: courseId.trim(),
            assessmentName: assessmentName.trim(),
            score,
            maxScore,
            date
        });

        if (!rows.length) {
            return res.status(404).json({
                error: 'Student or course not found. Check both IDs.'
            });
        }

        res.status(200).json({
            message: 'Assessment saved successfully.',
            ...rows[0]
        });
    } catch (error) {
        console.error('Save assessment error:', error.message);
        res.status(500).json({
            error: 'Could not save assessment.'
        });
    }
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});

async function shutdown() {
    server.close(async () => {
        await driver.close();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
