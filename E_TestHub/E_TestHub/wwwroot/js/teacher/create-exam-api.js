// Create Exam - API integration helpers
const CREATE_EXAM_API_BASE_URL = 'https://e-testhub-project.onrender.com/api';

const examApi = {
    classesCache: null,

    getToken() {
        return localStorage.getItem('token');
    },

    getCurrentUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            return user ? (user.id || user._id) : null;
        } catch (error) {
            console.error('Không thể đọc thông tin người dùng từ localStorage:', error);
            return null;
        }
    },

    normalizeId(value) {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'object') {
            const nestedId = value.id || value._id || value.value;
            if (nestedId) return nestedId.toString();
            if (typeof value.toString === 'function') {
                const str = value.toString();
                if (str && str !== '[object Object]') return str;
            }
        }
        return null;
    },

    formatAcademicYear(academicYear) {
        if (!academicYear) return '';
        if (typeof academicYear === 'string') {
            if (academicYear.includes(' - ')) return academicYear;
            if (academicYear.includes('-')) return academicYear.replace('-', ' - ');
            return academicYear;
        }
        if (typeof academicYear === 'object') {
            if (academicYear.startYear && academicYear.endYear) {
                return `${academicYear.startYear} - ${academicYear.endYear}`;
            }
        }
        return academicYear.toString();
    },

    buildClassDisplay(cls) {
        const name = cls.classCode || cls.name || 'Không xác định';
        const academicYear = this.formatAcademicYear(cls.academicYear || cls.year || cls.raw?.academicYear);
        if (academicYear) {
            return `${name} (${academicYear})`;
        }
        return name;
    },

    async fetchJson(url) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            let message = 'Không thể tải dữ liệu từ API.';
            try {
                const errorPayload = await response.json();
                message = errorPayload?.message || message;
            } catch (err) {
                // ignore parse error
            }
            throw new Error(message);
        }

        return response.json();
    },

    unwrapListResponse(payload) {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        const candidateKeys = ['data', 'items', 'results', 'list', 'value', 'classes'];
        for (const key of candidateKeys) {
            if (Array.isArray(payload[key])) return payload[key];
        }
        if (payload.data && typeof payload.data === 'object') {
            const nestedKeys = ['results', 'items', 'docs', 'data', 'classes'];
            for (const key of nestedKeys) {
                if (Array.isArray(payload.data[key])) return payload.data[key];
            }
            // Some APIs wrap again e.g. { data: { data: { docs: [] } } }
            if (payload.data.data && typeof payload.data.data === 'object') {
                const deeper = payload.data.data;
                for (const key of nestedKeys) {
                    if (Array.isArray(deeper[key])) return deeper[key];
                }
            }
        }
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.value)) return payload.value;
        if (Array.isArray(payload.results)) return payload.results;
        if (payload.message && Array.isArray(payload.message)) return payload.message;
        return [];
    },

    unwrapSingleResponse(payload) {
        if (!payload) return payload;
        if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
            return payload.data;
        }
        if (payload.result && typeof payload.result === 'object') {
            return payload.result;
        }
        if (payload.value && typeof payload.value === 'object' && !Array.isArray(payload.value)) {
            return payload.value;
        }
        return payload;
    },

    async loadCurrentTeacher() {
        const userId = this.getCurrentUserId();
        if (!userId) {
            throw new Error('Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
        }

        const payload = await this.fetchJson(`${CREATE_EXAM_API_BASE_URL}/users/${userId}`);
        return this.unwrapSingleResponse(payload);
    },

    async loadAllClasses() {
        const payload = await this.fetchJson(`${CREATE_EXAM_API_BASE_URL}/classes`);
        return this.unwrapListResponse(payload);
    },

    mapClasses(teacher, classesPayload) {
        const teachingSubjectsRaw = teacher?.teachingSubjects || [];
        const teachingSubjectIds = teachingSubjectsRaw
            .map(item => this.normalizeId(item?.classId || item?.class || item))
            .filter(Boolean)
            .map(id => id.toString());

        if (!teachingSubjectIds.length) {
            return [];
        }

        const classesList = this.unwrapListResponse(classesPayload) || classesPayload || [];
        const deduped = new Map();

        classesList.forEach(cls => {
            const rawId = this.normalizeId(cls?._id || cls?.id || cls);
            if (!rawId) return;
            const idStr = rawId.toString();
            if (!teachingSubjectIds.includes(idStr)) return;
            if (deduped.has(idStr)) return;

            deduped.set(idStr, {
                id: idStr,
                name: cls.classCode || cls.name || 'Không xác định',
                academicYear: cls.academicYear,
                raw: cls
            });
        });

        // Some APIs embed class objects directly inside teachingSubjects
        teachingSubjectsRaw.forEach(entry => {
            if (!entry) return;
            const classObj = entry.class || entry.classInfo || entry;
            const idStr = this.normalizeId(entry.classId || classObj?.id || classObj?._id || classObj);
            if (!idStr) return;
            if (!teachingSubjectIds.includes(idStr.toString())) return;
            if (deduped.has(idStr.toString())) return;

            deduped.set(idStr.toString(), {
                id: idStr.toString(),
                name: classObj.classCode || classObj.name || 'Không xác định',
                academicYear: classObj.academicYear,
                raw: classObj
            });
        });

        return Array.from(deduped.values());
    },

    populateClassSelects(classes) {
        const subjectSelect = document.getElementById('subject');
        const assignSelect = document.getElementById('assignTo');

        if (!subjectSelect || !assignSelect) {
            return;
        }

        subjectSelect.innerHTML = '';
        assignSelect.innerHTML = '';

        if (!classes || classes.length === 0) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Chưa có lớp nào được phân công';
            subjectSelect.appendChild(emptyOption);
            subjectSelect.disabled = true;

            const emptyAssign = document.createElement('option');
            emptyAssign.value = '';
            emptyAssign.textContent = 'Chưa có lớp nào để giao';
            assignSelect.appendChild(emptyAssign);
            assignSelect.disabled = true;
            return;
        }

        subjectSelect.disabled = false;
        assignSelect.disabled = false;

        classes.forEach((cls, index) => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = this.buildClassDisplay(cls);
            if (index === 0) {
                option.selected = true;
            }
            subjectSelect.appendChild(option);

            const assignOption = document.createElement('option');
            assignOption.value = cls.id;
            assignOption.textContent = this.buildClassDisplay(cls);
            if (index === 0) {
                assignOption.selected = true;
            }
            assignSelect.appendChild(assignOption);
        });

        // Trigger change event to refresh validation or preview if needed
        subjectSelect.dispatchEvent(new Event('change'));

        // Notify other scripts that class options are ready
        setTimeout(() => {
            const eventDetail = { classes: classes || [] };
            document.dispatchEvent(new CustomEvent('examClassOptionsReady', { detail: eventDetail }));
        }, 0);
    },

    async loadClassOptions() {
        try {
            if (this.classesCache) {
                this.populateClassSelects(this.classesCache);
                return;
            }

            const loadingOption = document.createElement('option');
            loadingOption.value = '';
            loadingOption.textContent = 'Đang tải danh sách lớp...';

            const subjectSelect = document.getElementById('subject');
            const assignSelect = document.getElementById('assignTo');
            if (subjectSelect) {
                subjectSelect.innerHTML = '';
                subjectSelect.appendChild(loadingOption.cloneNode(true));
            }
            if (assignSelect) {
                assignSelect.innerHTML = '';
                assignSelect.appendChild(loadingOption.cloneNode(true));
            }

            const teacher = await this.loadCurrentTeacher();
            let classes = [];

            try {
                const classesPayload = await this.loadAllClasses();
                classes = this.mapClasses(teacher, classesPayload);
            } catch (classError) {
                console.warn('Không thể tải danh sách lớp chung, thử lấy từ dữ liệu giáo viên:', classError);
            }

            if ((!classes || classes.length === 0) && teacher) {
                // Attempt fallback endpoint /classes/teacher/:id
                try {
                    const teacherId = this.normalizeId(teacher._id || teacher.id || teacher.userId || this.getCurrentUserId());
                    if (teacherId) {
                        const fallbackResponse = await this.fetchJson(`${CREATE_EXAM_API_BASE_URL}/classes/teacher/${teacherId}`);
                        const fallbackList = this.unwrapListResponse(fallbackResponse);
                        if (fallbackList && fallbackList.length > 0) {
                            classes = fallbackList.map(cls => ({
                                id: this.normalizeId(cls._id || cls.id || cls),
                                name: cls.classCode || cls.name || 'Không xác định',
                                academicYear: cls.academicYear,
                                raw: cls
                            }));
                        }
                    }
                } catch (fallbackError) {
                    console.warn('Fallback /classes/teacher endpoint unavailable:', fallbackError);
                }
            }

            if ((!classes || classes.length === 0) && teacher) {
                // Final fallback: use teachingSubjects data directly
                const teachingSubjectsRaw = teacher.teachingSubjects || teacher.classes || [];
                classes = (teachingSubjectsRaw || []).map(entry => {
                    const classObj = entry.class || entry.classInfo || entry;
                    const id = this.normalizeId(entry.classId || classObj?.id || classObj?._id || classObj);
                    if (!id) return null;
                    return {
                        id: id.toString(),
                        name: classObj?.classCode || classObj?.name || entry.name || 'Không xác định',
                        academicYear: classObj?.academicYear,
                        raw: classObj
                    };
                }).filter(Boolean);
            }

            this.classesCache = classes;
            this.populateClassSelects(classes);
        } catch (error) {
            console.error('Không thể tải danh sách lớp học:', error);
            alert(error?.message || 'Không thể tải danh sách lớp học.');

            const subjectSelect = document.getElementById('subject');
            const assignSelect = document.getElementById('assignTo');
            if (subjectSelect) {
                subjectSelect.innerHTML = '';
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Không thể tải lớp học';
                subjectSelect.appendChild(option);
                subjectSelect.disabled = true;
            }
            if (assignSelect) {
                assignSelect.innerHTML = '';
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Không thể tải lớp học';
                assignSelect.appendChild(option);
                assignSelect.disabled = true;
            }
        }
    },

    calculateTotalPoints(formData) {
        const manualPoints = (formData.manualQuestions || []).reduce((sum, question) => {
            const points = parseFloat(question.points);
            return sum + (Number.isFinite(points) ? points : 0);
        }, 0);

        const bankPoints = (formData.bankQuestionDetails || []).reduce((sum, question) => {
            const points = Number(question.points);
            return sum + (Number.isFinite(points) ? points : 0);
        }, 0);

        return manualPoints + bankPoints;
    },

    buildExamPayload(formData, options = {}) {
        const { includeQuestions = true } = options;
        const teacherId = this.getCurrentUserId();
        const primaryClassId = formData.subject;
        const assignedClassIds = (formData.assignTo && formData.assignTo.length > 0)
            ? formData.assignTo.map(id => this.normalizeId(id)).filter(Boolean)
            : (primaryClassId ? [this.normalizeId(primaryClassId)] : []);

        const transformManualQuestion = (question, index) => ({
            order: index + 1,
            content: question.text,
            type: question.type,
            difficulty: question.difficulty,
            points: parseFloat(question.points) || 1,
            answers: (question.answers || []).map((answer, answerIndex) => ({
                order: answerIndex + 1,
                content: answer.text,
                isCorrect: !!answer.isCorrect
            }))
        });

        const settings = {
            shuffleQuestions: !!formData.shuffleQuestions,
            shuffleAnswers: !!formData.shuffleAnswers,
            showResults: !!formData.showResults,
            allowReview: !!formData.allowReview,
            passingScore: formData.passingScore !== '' ? Number(formData.passingScore) : null
        };

        const manualQuestionIds = (formData.createdManualQuestionIds || []).map(id => this.normalizeId(id)).filter(Boolean);
        const bankQuestionIds = (formData.bankQuestions || []).map(id => this.normalizeId(id)).filter(Boolean);
        const allQuestionIds = Array.from(new Set([...manualQuestionIds, ...bankQuestionIds]));

        const payload = {
            title: formData.examName,
            description: formData.description,
            classIds: assignedClassIds,
            teacherId,
            duration: formData.duration ? Number(formData.duration) : undefined,
            openAt: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
            closeAt: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
            shuffleQuestions: !!formData.shuffleQuestions,
            shuffleAnswers: !!formData.shuffleAnswers,
            showResultImmediately: !!formData.showResults,
            allowReview: !!formData.allowReview,
            status: formData.status,
            maxAttempts: formData.maxAttempts !== undefined ? formData.maxAttempts : undefined,
            passingScore: formData.passingScore !== '' ? Number(formData.passingScore) : undefined,
            totalPoints: includeQuestions ? this.calculateTotalPoints(formData) : undefined
        };

        if (includeQuestions) {
            payload.questionIds = allQuestionIds;
            payload.questions = (formData.manualQuestions || []).map(transformManualQuestion);
        }

        Object.keys(payload).forEach((key) => {
            if (payload[key] === undefined || payload[key] === null) {
                delete payload[key];
            }
        });

        payload.settings = settings;

        return payload;
    },

    async createExamDraft(formData) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const payload = this.buildExamPayload(formData, { includeQuestions: false });

        const response = await fetch(`${CREATE_EXAM_API_BASE_URL}/exams`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let message = 'Không thể tạo đề thi.';
            try {
                const errorPayload = await response.json();
                message = errorPayload?.message || message;
            } catch (err) {
                // ignore
            }
            throw new Error(message);
        }

        const resultPayload = await response.json();
        return this.unwrapSingleResponse(resultPayload);
    },

    async updateExamDraft(examId, formData, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        if (!examId) {
            throw new Error('Không tìm thấy examId để cập nhật.');
        }

        const payload = this.buildExamPayload(formData, options);

        const response = await fetch(`${CREATE_EXAM_API_BASE_URL}/exams/${examId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let message = 'Không thể cập nhật đề thi.';
            try {
                const errorPayload = await response.json();
                message = errorPayload?.message || message;
            } catch (err) {
                // ignore
            }
            throw new Error(message);
        }

        const resultPayload = await response.json();
        return this.unwrapSingleResponse(resultPayload);
    },

    async submitExam(formData) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        if (!formData.subject) {
            throw new Error('Vui lòng chọn lớp học cho đề thi.');
        }

        const payload = this.buildExamPayload(formData, { includeQuestions: true });
        const examId = this.normalizeId(formData.examId);

        const endpoint = examId
            ? `${CREATE_EXAM_API_BASE_URL}/exams/${examId}`
            : `${CREATE_EXAM_API_BASE_URL}/exams`;

        const method = examId ? 'PUT' : 'POST';

        const response = await fetch(endpoint, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let message = examId ? 'Không thể cập nhật đề thi.' : 'Không thể tạo đề thi mới.';
            try {
                const errorPayload = await response.json();
                message = errorPayload?.message || message;
            } catch (err) {
                // ignore parse error
            }
            throw new Error(message);
        }

        const resultPayload = await response.json();
        return this.unwrapSingleResponse(resultPayload);
    },

    async getClassDetails(classId) {
        if (!classId) return null;
        try {
            const payload = await this.fetchJson(`${CREATE_EXAM_API_BASE_URL}/classes/${classId}`);
            return this.unwrapSingleResponse(payload);
        } catch (error) {
            console.warn('Không thể lấy thông tin lớp học:', error);
            return null;
        }
    },

    async fetchQuestionById(questionId) {
        if (!questionId) return null;
        try {
            const payload = await this.fetchJson(`${CREATE_EXAM_API_BASE_URL}/questions/${questionId}`);
            return this.unwrapSingleResponse(payload);
        } catch (error) {
            console.warn(`Không thể lấy thông tin câu hỏi ${questionId}:`, error);
            return null;
        }
    },

    formatQuestionForBank(questionDoc, classInfo) {
        if (!questionDoc) return null;

        const id = this.normalizeId(questionDoc._id || questionDoc.id || questionDoc.questionId || questionDoc);
        if (!id) return null;

        const difficultyValue = questionDoc.difficulty || questionDoc.level || questionDoc.difficultyLevel;
        const difficulty = (difficultyValue || 'medium').toString().toLowerCase();
        const difficultyLabelMap = {
            easy: 'Dễ',
            medium: 'Trung bình',
            hard: 'Khó'
        };

        const pointsValue = questionDoc.points || questionDoc.score || questionDoc.point || 1;
        const points = Number(pointsValue);

        const subjectName = classInfo?.name || classInfo?.classCode || classInfo?.title || questionDoc.subjectName || 'Không xác định';

        const options = Array.isArray(questionDoc.options)
            ? questionDoc.options
            : [questionDoc.answerA, questionDoc.answerB, questionDoc.answerC, questionDoc.answerD].filter(Boolean);

        return {
            id,
            content: questionDoc.content || questionDoc.text || questionDoc.title || questionDoc.question || 'Câu hỏi không có nội dung',
            difficulty,
            difficultyLabel: difficultyLabelMap[difficulty] || difficulty,
            points,
            subjectName,
            correctAnswer: questionDoc.correctAnswer || questionDoc.correct || questionDoc.correct_option,
            options,
            raw: questionDoc
        };
    },

    async loadQuestionsForClass(classId) {
        if (!classId) {
            return [];
        }

        try {
            const classDetails = await this.getClassDetails(classId);
            let questionRefs = [];
            if (Array.isArray(classDetails?.questions)) {
                questionRefs = classDetails.questions;
            } else if (classDetails?.questions && typeof classDetails.questions === 'object') {
                questionRefs = Object.values(classDetails.questions).flat();
            }

            if (!questionRefs.length) {
                return [];
            }

            const seen = new Set();
            const questions = [];

            for (const ref of questionRefs) {
                const refId = this.normalizeId(ref?.questionId || ref?._id || ref?.question || ref);
                const idToLoad = refId || this.normalizeId(ref);
                if (!idToLoad) continue;
                if (seen.has(idToLoad.toString())) continue;

                let questionDoc = ref;
                if (!questionDoc || Object.keys(questionDoc).length <= 1) {
                    questionDoc = await this.fetchQuestionById(idToLoad);
                }
                if (!questionDoc) continue;

                const formatted = this.formatQuestionForBank(questionDoc, {
                    name: classDetails?.classCode || classDetails?.name
                });
                if (formatted) {
                    seen.add(formatted.id.toString());
                    questions.push(formatted);
                }
            }

            return questions;
        } catch (error) {
            console.error('Không thể tải câu hỏi của lớp:', error);
            return [];
        }
    },

    async loadExamsForClass(classId) {
        try {
            const payload = await this.fetchJson(`${CREATE_EXAM_API_BASE_URL}/exams?classId=${classId}`);
            return this.unwrapListResponse(payload);
        } catch (error) {
            console.warn('Không thể tải danh sách đề thi của lớp:', error);
            return [];
        }
    },

    async loadQuestionsFromExistingExams(classId) {
        const exams = await this.loadExamsForClass(classId);
        if (!Array.isArray(exams) || exams.length === 0) {
            return [];
        }

        const questions = [];
        const seen = new Set();

        for (const exam of exams) {
            const bankIds = Array.isArray(exam.questionBankIds) ? exam.questionBankIds : [];
            const manualIds = Array.isArray(exam.manualQuestionIds) ? exam.manualQuestionIds : [];
            const allIds = [...bankIds, ...manualIds].map(id => this.normalizeId(id)).filter(Boolean);

            for (const qId of allIds) {
                if (seen.has(qId)) continue;
                const questionDoc = await this.fetchQuestionById(qId);
                if (!questionDoc) continue;
                seen.add(qId);
                const formatted = this.formatQuestionForBank(questionDoc, exam);
                if (formatted) {
                    questions.push(formatted);
                }
            }
        }

        return questions;
    },

    async updateClassWithQuestion(classId, questionId) {
        if (!classId || !questionId) return;

        const token = this.getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        const classDetails = await this.getClassDetails(classId);
        const questionsArray = Array.isArray(classDetails?.questions) ? [...classDetails.questions] : [];
        const existingIds = new Set(questionsArray.map(q => this.normalizeId(q?.question || q?.questionId || q)?.toString()).filter(Boolean));
        const questionIdStr = questionId.toString();

        if (!existingIds.has(questionIdStr)) {
            questionsArray.push(questionId);

            await fetch(`${CREATE_EXAM_API_BASE_URL}/classes/${classId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questions: questionsArray
                })
            });
        }
    },

    async createQuestionForClass(classId, question) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }

        if (!classId) {
            throw new Error('Vui lòng chọn lớp học trước khi tạo câu hỏi.');
        }

        if (question.type && question.type !== 'multiple-choice') {
            throw new Error('Hiện tại chỉ hỗ trợ tạo câu hỏi trắc nghiệm 1 đáp án đúng thông qua API.');
        }

        const answers = question.answers || [];
        if (answers.length < 2) {
            throw new Error('Câu hỏi cần ít nhất 2 đáp án.');
        }

        if (answers.length > 4) {
            throw new Error('Vui lòng chỉ nhập tối đa 4 đáp án cho mỗi câu hỏi trắc nghiệm.');
        }

        const optionLetters = ['A', 'B', 'C', 'D'];
        const payload = {
            content: question.text,
            answerA: answers[0]?.text || '',
            answerB: answers[1]?.text || '',
            answerC: answers[2]?.text || '',
            answerD: answers[3]?.text || '',
            correctAnswer: (() => {
                const correctIndex = answers.findIndex(ans => ans.isCorrect);
                if (correctIndex === -1) {
                    throw new Error('Vui lòng chọn đáp án đúng cho mỗi câu hỏi.');
                }
                return optionLetters[correctIndex] || 'A';
            })(),
            difficulty: question.difficulty || 'medium',
            points: Number(question.points) || 1,
            classId
        };

        const response = await fetch(`${CREATE_EXAM_API_BASE_URL}/questions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let message = 'Không thể tạo câu hỏi mới.';
            try {
                const errorPayload = await response.json();
                message = errorPayload?.message || message;
            } catch (err) {
                // ignore
            }
            throw new Error(message);
        }

        const result = await response.json();
        const questionDoc = this.unwrapSingleResponse(result);
        const createdId = this.normalizeId(questionDoc?._id || questionDoc?.id || questionDoc?.questionId);

        if (createdId) {
            try {
                await this.updateClassWithQuestion(classId, createdId);
            } catch (error) {
                console.warn('Không thể cập nhật lớp với câu hỏi mới:', error);
            }
        }

        return {
            id: createdId,
            doc: questionDoc
        };
    },

    async persistManualQuestions(formData) {
        const classId = formData.subject;
        const manualQuestions = formData.manualQuestions || [];

        if (!manualQuestions.length) {
            return [];
        }

        const createdIds = [];

        for (let index = 0; index < manualQuestions.length; index++) {
            const question = manualQuestions[index];
            if (question.questionId) {
                const idStr = question.questionId.toString();
                question.questionId = idStr;
                createdIds.push(idStr);
                continue;
            }

            try {
                const { id: newId } = await this.createQuestionForClass(classId, question);
                if (newId) {
                    const newIdStr = newId.toString();
                    createdIds.push(newIdStr);
                    question.questionId = newIdStr;
                    const card = document.querySelector(`.manual-question-card[data-question-index="${question.__cardIndex}"]`);
                    if (card) {
                        card.dataset.questionId = newId;
                    }
                }
            } catch (error) {
                console.error('Không thể tạo câu hỏi thủ công:', error);
                throw error;
            }
        }

        return Array.from(new Set(createdIds));
    }
};

window.examApi = window.examApi ? { ...window.examApi, ...examApi } : examApi;

document.addEventListener('DOMContentLoaded', () => {
    if (window.examApi && typeof window.examApi.loadClassOptions === 'function') {
        window.examApi.loadClassOptions();
    }
});
