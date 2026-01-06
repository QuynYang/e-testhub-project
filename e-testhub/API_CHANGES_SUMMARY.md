# API Changes Summary

This document outlines all the changes made to align the API with the enhanced data model schema.

## Models Updated

### 1. User Model (`src/models/User.js`)

**New Fields Added:**

- `email` (required, unique) - User's email address
- `firstName` (required) - User's first name
- `lastName` (required) - User's last name
- `isActive` (boolean, default: true) - Account active status

**Changes:**

- Replaced `fullName` with separate `firstName` and `lastName` fields
- Added virtual `fullName` getter for backward compatibility
- Updated post-delete hook to handle both `userId` and `studentId` in submissions

### 2. Class Model (`src/models/Class.js`)

**New Fields Added:**

- `classCode` (required, unique, uppercase) - Unique class code
- `teacherId` (required, ref: User) - Reference to teacher user
- `students` (array of User IDs) - List of enrolled students
- `courses` (array of Course IDs) - List of courses in this class
- `academicYear` (required) - Academic year for the class

### 3. Course Model (`src/models/Course.js`)

**New Fields Added:**

- `title` (required) - Course title
- `description` - Course description
- `subjectId` (required, ref: Subject) - Reference to subject
- `instructorId` (required, ref: User) - Reference to instructor
- `prerequisites` - Prerequisites for the course
- `duration` (required, min: 1) - Course duration

**Note:** Existing fields (`name`, `startYear`, `endYear`) are preserved for backward compatibility

### 4. Subject Model (`src/models/Subject.js`)

**New Fields Added:**

- `code` (required, unique) - Subject code

### 5. Question Model (`src/models/Question.js`)

**New Fields Added:**

- `text` (required) - Question text (alternative to content)
- `type` (enum: "multiple-choice", "essay", "true-false", default: "multiple-choice") - Question type
- `subjectId` (ref: Subject) - Reference to subject
- `difficultyLevel` (enum: "easy", "medium", "hard", default: "medium") - Question difficulty

**Note:** Both `text` and `content` fields are maintained for compatibility

### 6. Exam Model (`src/models/Exam.js`)

**New Fields Added:**

- `description` - Exam description
- `questionIds` (array, ref: Question) - Array of question IDs
- `maxAttempts` (number, default: 1, min: 1) - Maximum attempt limit
- `passingScore` (number, default: 50, min: 0, max: 100) - Minimum passing score percentage
- `isPublished` (boolean, default: false) - Publication status

**Note:** Existing `questions` array is preserved for backward compatibility

### 7. ExamSchedule Model (`src/models/ExamSchedule.js`)

**New Fields Added:**

- `isClosed` (boolean, default: false) - Schedule closure status

### 8. Submission Model (`src/models/Submission.js`)

**New Fields Added:**

- `userId` (required, ref: User) - User who submitted
- `score` (number, default: 0) - Submission score
- `status` (enum: "pending", "graded", "reviewed", default: "pending") - Submission status

**Note:** Both `userId` and `studentId` are maintained for compatibility

- Added unique index for `{ examId: 1, userId: 1 }`
- Existing `isGraded` field is preserved

## Controllers Updated

### User Controller

- Updated `create` method to handle `email`, `firstName`, `lastName`, `isActive`
- Updated `update` method to handle new fields
- **New endpoint:** `GET /api/users/statistics` - Returns user statistics by role

### Class Controller

- Updated `create` and `update` methods to handle all new fields: `classCode`, `teacherId`, `students`, `courses`, `academicYear`

### Course Controller

- Updated `create` and `update` methods to handle new fields: `title`, `description`, `subjectId`, `instructorId`, `prerequisites`, `duration`

### Subject Controller

- Updated `create` and `update` methods to handle `code` field

### Question Controller

- Updated `create` and `update` methods to handle `text`, `type`, `subjectId`, `difficultyLevel`
- Added backward compatibility for `content` field

### Exam Controller

- Updated `create` and `update` methods to handle `description`, `questionIds`, `maxAttempts`, `passingScore`, `isPublished`
- **New endpoint:** `GET /api/exams/statistics` - Returns exam statistics

### Schedule Controller

- Updated `create` and `update` methods to handle `isClosed` field

### Submission Controller

- Updated `create` and `update` methods to handle `userId`, `score`, `status`
- **New endpoints:**
  - `GET /api/submissions/statistics` - Returns submission statistics
  - `GET /api/submissions/exam/:examId` - Get all submissions for an exam
  - `GET /api/submissions/user/:userId` - Get all submissions for a user

## New API Endpoints

### Statistics Endpoints

1. **User Statistics**

   - `GET /api/users/statistics`
   - Returns: Total users, active users, user distribution by role

2. **Exam Statistics**

   - `GET /api/exams/statistics`
   - Returns: Total exams, published exams, locked exams, distribution by subject

3. **Submission Statistics**
   - `GET /api/submissions/statistics`
   - Returns: Total submissions, graded submissions, pending submissions, average score, status distribution

### Query Endpoints

4. **Get Submissions by Exam**

   - `GET /api/submissions/exam/:examId`
   - Returns all submissions for a specific exam

5. **Get Submissions by User**
   - `GET /api/submissions/user/:userId`
   - Returns all submissions for a specific user (checks both userId and studentId for compatibility)

## Backward Compatibility

All changes maintain backward compatibility:

- Existing fields are preserved where possible
- Both old and new field names are supported in many cases (e.g., `userId` and `studentId`, `text` and `content`, `questions` and `questionIds`)
- Controllers handle both old and new field formats

## Database Migration Notes

⚠️ **Important:** If you have existing data, you may need to run migration scripts to populate the new fields. The models have been updated to support the enhanced schema while maintaining backward compatibility.

## Testing Recommendations

1. Test creating users with new fields (firstName, lastName, email)
2. Test updating existing records to verify backward compatibility
3. Test new statistics endpoints
4. Test new submission query endpoints
5. Verify that existing functionality still works as expected
