# API Endpoints Reference

## User Management

### GET /api/users

- **Description:** List all users
- **Response:** Array of user objects

### GET /api/users/statistics

- **Description:** Get user statistics
- **Response:**

```json
{
  "byRole": [{ "_id": "student", "count": 50 }],
  "total": 100,
  "active": 95
}
```

### GET /api/users/:id

- **Description:** Get user by ID
- **Response:** User object

### POST /api/users

- **Description:** Create a new user
- **Body (required):**
  - `username` (string, unique)
  - `email` (string, unique, required)
  - `password` (string, required)
  - `firstName` (string, required)
  - `lastName` (string, required)
  - `role` (enum: "student", "teacher", "admin", required)
  - `isActive` (boolean, optional, default: true)
  - `classId` (ObjectId, optional)
  - `teachingSubjects` (array of ObjectIds, optional)

### PUT /api/users/:id

- **Description:** Update user
- **Body (optional):**
  - `firstName`, `lastName`, `email`, `role`, `isActive`, `classId`, `teachingSubjects`, etc.

### DELETE /api/users/:id

- **Description:** Delete user
- **Response:** `{ "deleted": true }`

---

## Class Management

### GET /api/classes

### GET /api/classes/:id

### POST /api/classes

- **Body (required):**
  - `name` (string)
  - `classCode` (string, unique, required)
  - `teacherId` (ObjectId, required)
  - `academicYear` (string, required)
  - `courseId` (ObjectId, required)
- **Body (optional):**
  - `students` (array of ObjectIds)
  - `courses` (array of ObjectIds)

### PUT /api/classes/:id

### DELETE /api/classes/:id

---

## Course Management

### GET /api/courses

### GET /api/courses/:id

### POST /api/courses

- **Body (required):**
  - `title` (string)
  - `subjectId` (ObjectId)
  - `instructorId` (ObjectId)
  - `duration` (number, min: 1)
  - `name` (string) - existing field
  - `startYear` (number) - existing field
  - `endYear` (number) - existing field
- **Body (optional):**
  - `description`, `prerequisites`

### PUT /api/courses/:id

### DELETE /api/courses/:id

---

## Subject Management

### GET /api/subjects

### GET /api/subjects/:id

### POST /api/subjects

- **Body (required):**
  - `name` (string)
  - `code` (string, unique)
- **Body (optional):**
  - `description`

### PUT /api/subjects/:id

### DELETE /api/subjects/:id

---

## Question Management

### GET /api/questions

### GET /api/questions/:id

### POST /api/questions

- **Body (required):**
  - `examId` (ObjectId)
  - `text` or `content` (string) - question text
  - `options` (array of strings, 2-4 items)
  - `correctAnswer` (enum: "A", "B", "C", "D")
  - `score` (number, min: 0)
- **Body (optional):**
  - `type` (enum: "multiple-choice", "essay", "true-false")
  - `subjectId` (ObjectId)
  - `difficultyLevel` (enum: "easy", "medium", "hard")

### PUT /api/questions/:id

### DELETE /api/questions/:id

---

## Exam Management

### GET /api/exams

### GET /api/exams/statistics

- **Description:** Get exam statistics
- **Response:**

```json
{
  "total": 20,
  "published": 15,
  "locked": 3,
  "subjectDistribution": [{ "_id": "subjectId1", "count": 10 }]
}
```

### GET /api/exams/:id

### POST /api/exams

- **Body (required):**
  - `title` (string)
  - `subjectId` (ObjectId)
  - `teacherId` (ObjectId)
  - `duration` (number, min: 1)
- **Body (optional):**
  - `description`, `questionIds` (array), `questions` (array),
    `maxAttempts`, `passingScore`, `isPublished`, `isLocked`

### PUT /api/exams/:id

### DELETE /api/exams/:id

---

## Exam Schedule Management

### GET /api/schedules

### GET /api/schedules/:id

### POST /api/schedules

- **Body (required):**
  - `examId` (ObjectId)
  - `classId` (ObjectId)
  - `startTime` (ISO date string)
  - `endTime` (ISO date string, must be after startTime)
- **Body (optional):**
  - `isClosed` (boolean, default: false)

### PUT /api/schedules/:id

### DELETE /api/schedules/:id

---

## Submission Management

### GET /api/submissions

### GET /api/submissions/statistics

- **Description:** Get submission statistics
- **Response:**

```json
{
  "total": 500,
  "graded": 450,
  "pending": 50,
  "averageScore": 75.5,
  "statusDistribution": [{ "_id": "graded", "count": 450 }]
}
```

### GET /api/submissions/exam/:examId

- **Description:** Get all submissions for a specific exam
- **Response:** Array of submission objects

### GET /api/submissions/user/:userId

- **Description:** Get all submissions for a specific user
- **Response:** Array of submission objects

### GET /api/submissions/:id

### POST /api/submissions

- **Body (required):**
  - `userId` or `studentId` (ObjectId)
  - `examId` (ObjectId)
- **Body (optional):**
  - `answers` (array), `score`, `status` (enum: "pending", "graded", "reviewed"), `isGraded`

### PUT /api/submissions/:id

### DELETE /api/submissions/:id

---

## Key Changes Summary

### New Required Fields

**User Creation:**

- `email` (unique)
- `firstName`
- `lastName`

**Class Creation:**

- `classCode` (unique)
- `teacherId`
- `academicYear`

**Course Creation:**

- `title`
- `subjectId`
- `instructorId`
- `duration`

**Subject Creation:**

- `code` (unique)

### New Optional Fields

**Question:** `text`, `type`, `subjectId`, `difficultyLevel`
**Exam:** `description`, `questionIds`, `maxAttempts`, `passingScore`, `isPublished`
**ExamSchedule:** `isClosed`
**Submission:** `userId`, `score`, `status`

### New Endpoints

1. `GET /api/users/statistics` - User statistics
2. `GET /api/exams/statistics` - Exam statistics
3. `GET /api/submissions/statistics` - Submission statistics
4. `GET /api/submissions/exam/:examId` - Submissions by exam
5. `GET /api/submissions/user/:userId` - Submissions by user

### Backward Compatibility

- `fullName` is auto-generated from `firstName` + `lastName`
- Both `userId` and `studentId` work in submissions
- Both `questions` and `questionIds` work for exams
- Both `text` and `content` work for questions
