const API_BASE = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000" : "";

// =========================================
// DATA & STATE MANAGEMENT (LocalStorage)
// =========================================

const defaultData = {
    streak: { current: 3, longest: 7, days: [] },
    progress: { completion: 15, xp: 450, totalTime: 12 },
    schedule: [
        { day: 'Today', task: 'Python — Functions', status: 'pending' },
        { day: 'Tomorrow', task: 'DBMS — Normalization', status: 'pending' },
        { day: 'Upcoming', task: 'Java — OOP', status: 'pending' }
    ],
    recentActivity: [
        { text: 'Signed in', date: new Date().toISOString() }
    ],
    weakTopics: [
        { topic: "Inheritance in Java", attempts: 3, accuracy: "40%" },
        { topic: "SQL Joins", attempts: 2, accuracy: "50%" }
    ],
    continueLearning: [
        { subject: "Python", progress: 60, icon: "🐍" },
        { subject: "DBMS", progress: 30, icon: "🗄️" },
        { subject: "Java", progress: 15, icon: "☕" }
    ],
    studyPath: [
        { text: "Python Basics", status: "completed" },
        { text: "Variables & Data Types", status: "completed" },
        { text: "Conditions & Loops", status: "current" },
        { text: "Functions", status: "pending" },
        { text: "OOP Concepts", status: "pending" },
        { text: "File Handling", status: "pending" }
    ],
    mcqsSolved: 0,
    sessions: 12
};

function loadData() {
    let data = localStorage.getItem('studyFlowData');
    if (!data) {
        saveData(defaultData);
        return defaultData;
    }
    return JSON.parse(data);
}

function saveData(data) {
    localStorage.setItem('studyFlowData', JSON.stringify(data));
}

let userData = loadData();

function logActivity(text) {
    userData.recentActivity.unshift({ text, date: new Date().toISOString() });
    if(userData.recentActivity.length > 5) userData.recentActivity.pop();
    saveData(userData);
    renderRecentActivity();
}

function addXP(amount) {
    userData.progress.xp += amount;
    saveData(userData);
    renderProgressStats();
}

// =========================================
// NAVIGATION & SIDEBAR
// =========================================

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function navigate(pageId, title = "") {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    
    // De-activate sidebar on mobile
    document.getElementById('sidebar').classList.remove('active');
    
    // Check if coming soon
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
        const menuItem = document.querySelector(`.menu-item[data-page="${pageId}"]`);
        if (menuItem) menuItem.classList.add('active');
    } else if (document.getElementById('page-coming-soon')) {
        document.getElementById('page-coming-soon').classList.add('active');
        document.getElementById('coming-soon-title').textContent = title || "Feature";
        const menuItem = document.querySelector(`.menu-item[data-title="${title}"]`);
        if (menuItem) menuItem.classList.add('active');
    }
    
    // Trigger specific renders
    if (pageId === 'home') renderDashboard();
    if (pageId === 'progress') renderProgressPage();
    if (pageId === 'streak') renderStreakPage();
    if (pageId === 'weak-topics') renderWeakTopicsPage();
    if (pageId === 'smart-revision') renderSmartRevisionPage();
    if (pageId === 'study-path') renderStudyPath();
    
    window.scrollTo(0,0);
}

// Attach Nav Listeners
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = item.dataset.page;
        const title = item.dataset.title;
        navigate(pageId, title);
    });
});

// =========================================
// RENDERERS
// =========================================

function renderDashboard() {
    renderProgressStats();
    
    // Schedule
    const schedList = document.getElementById('home-schedule-list');
    if (schedList) {
        schedList.innerHTML = userData.schedule.map(s => `
            <div class="schedule-item">
                <div class="schedule-day">${s.day}</div>
                <div class="schedule-task">${s.task}</div>
                <div class="status-dot ${s.status === 'completed' ? 'active' : ''}"></div>
            </div>
        `).join('');
    }
    
    renderRecentActivity();
    
    // Continue Learning
    const contLearn = document.getElementById('home-continue-learning');
    if (contLearn) {
        contLearn.innerHTML = userData.continueLearning.map(s => `
            <div class="subject-card">
                <div class="subj-header">
                    <span class="subj-icon">${s.icon}</span>
                    <span class="subj-pct">${s.progress}%</span>
                </div>
                <h4>${s.subject}</h4>
                <p>Pick up where you left off</p>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${s.progress}%;"></div>
                </div>
                <button class="primary-btn" onclick="navigate('study-path')">Continue</button>
            </div>
        `).join('');
    }
}

function renderProgressStats() {
    const pComp = document.getElementById('stat-completion');
    const pStrk = document.getElementById('stat-streak');
    const pXp = document.getElementById('stat-xp');
    if(pComp) pComp.textContent = userData.progress.completion + '%';
    if(pStrk) pStrk.textContent = userData.streak.current;
    if(pXp) pXp.textContent = userData.progress.xp;
}

function renderRecentActivity() {
    const actList = document.getElementById('home-activity-list');
    const progActList = document.getElementById('prog-activity');
    
    const html = userData.recentActivity.length === 0 
        ? '<div style="color: var(--text-sec); font-size: 13px;">No recent activity yet.</div>'
        : userData.recentActivity.map(a => `
            <div class="activity-item">
                <div class="status-dot active" style="margin-right: 12px;"></div>
                <div class="activity-text">${a.text}</div>
            </div>
        `).join('');
        
    if(actList) actList.innerHTML = html;
    if(progActList) progActList.innerHTML = html;
}

function renderStudyPath() {
    const list = document.getElementById('study-path-list');
    if(!list) return;
    
    list.innerHTML = userData.studyPath.map(s => {
        let icon = '⏳';
        if(s.status === 'completed') icon = '✅';
        if(s.status === 'current') icon = '📍';
        return `
            <div class="path-item ${s.status}">
                <div class="path-icon">${icon}</div>
                <div class="path-text">${s.text}</div>
            </div>
        `;
    }).join('');
}

function renderProgressPage() {
    document.getElementById('prog-mcq').textContent = userData.mcqsSolved;
    document.getElementById('prog-sessions').textContent = userData.sessions;
    document.getElementById('prog-xp').textContent = userData.progress.xp;
    renderRecentActivity();
}

function renderStreakPage() {
    document.getElementById('streak-current').textContent = userData.streak.current;
    document.getElementById('streak-longest').textContent = userData.streak.longest;
}

function renderWeakTopicsPage() {
    const tbody = document.querySelector('#weak-topics-table tbody');
    if(!tbody) return;
    
    if(userData.weakTopics.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No weak topics identified yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = userData.weakTopics.map(w => `
        <tr>
            <td><strong>${w.topic}</strong></td>
            <td>${w.attempts}</td>
            <td style="color: var(--error); font-weight: 600;">${w.accuracy}</td>
            <td><button class="primary-btn" onclick="navigate('mcqs')">Revise</button></td>
        </tr>
    `).join('');
}

function renderSmartRevisionPage() {
    const list = document.getElementById('revision-list');
    if(!list) return;
    
    if(userData.weakTopics.length === 0) {
        list.innerHTML = '<p class="text-muted">You are all caught up! Take a Mock Test to identify areas for improvement.</p>';
        return;
    }
    
    list.innerHTML = userData.weakTopics.map(w => `
        <div class="dashboard-card">
            <h3 style="margin-bottom: 4px;">${w.topic}</h3>
            <p style="font-size: 12px; color: var(--error); margin-bottom: 16px;">Accuracy: ${w.accuracy}</p>
            <button class="primary-btn" onclick="navigate('ai-notes')">Generate Notes</button>
        </div>
    `).join('');
}

// =========================================
// AI BACKEND INTEGRATION
// =========================================

async function fetchAIResponse(question, mode, buttonEl, answerEl) {
    if (question === "") {
        answerEl.innerHTML = "<p style='padding:16px;'>Please enter a topic or question first.</p>";
        return;
    }

    // State
    const originalText = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = "Thinking...";
    answerEl.style.display = "block";
    answerEl.innerHTML = '<div class="loading-indicator">StudyFlow is thinking...</div>';

    try {
        const response = await fetch(`${API_BASE}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, mode })
        });

        if (!response.ok) {
            answerEl.innerHTML = mode === "mcq" 
                ? "<p style='padding:16px;'>Could not generate the quiz. Please try again.</p>"
                : "<p style='padding:16px;'>Something went wrong. Please try again.</p>";
            console.error("Backend failed:", response.statusText);
        } else {
            const data = await response.json();
            
            if (mode === "mcq" && data.isJson && data.answer.questions) {
                startMCQQuiz(data.answer.questions, question, answerEl);
                logActivity(`Practiced MCQs on: ${question}`);
                userData.sessions++;
                saveData(userData);
            } else if (mode === "mcq") {
                answerEl.innerHTML = "<p style='padding:16px;'>Could not generate the quiz. Please try again.</p>";
            } else {
                displayNormalAnswer(data.answer, answerEl);
                logActivity(`Used ${mode} for: ${question}`);
                userData.sessions++;
                addXP(10);
                if (mode === "notes") {
                    localStorage.setItem('studyFlowLatestNotes', data.answer);
                    latestNotes = data.answer;
                    const statusEl = document.getElementById('ask-notes-status');
                    if (statusEl) {
                        statusEl.textContent = "Ready to answer questions about your last generated notes.";
                        statusEl.style.color = "var(--success)";
                    }
                }

            }
        }
    } catch (error) {
        answerEl.innerHTML = mode === "mcq" 
            ? "<p style='padding:16px;'>Could not generate the quiz. Please try again.</p>"
            : "<p style='padding:16px;'>Something went wrong. Please try again.</p>";
        console.error(error);
    } finally {
        buttonEl.disabled = false;
        buttonEl.textContent = originalText;
    }
}

function displayNormalAnswer(text, answerContainer) {
    const htmlContent = marked.parse(text);
    const id = 'md-' + Math.random().toString(36).substr(2, 9);
    
    answerContainer.innerHTML = `
        <div style="position: relative;">
            <button class="copy-btn" onclick="copyAnswer('${id}', this)">Copy</button>
            <div class="markdown-body" id="${id}">${htmlContent}</div>
        </div>
    `;
}

window.copyAnswer = function(id, btn) {
    const textToCopy = document.getElementById(id).innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });
};

// =========================================
// WIRING UP INPUTS
// =========================================

function setupInput(inputId, btnId, mode, answerId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    const answer = document.getElementById(answerId);
    
    if (!input || !btn || !answer) return;

    btn.addEventListener('click', () => {
        fetchAIResponse(input.value.trim(), mode, btn, answer);
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btn.click();
        }
    });
}

// Home Assistant
setupInput('home-ask-input', 'home-ask-btn', 'normal', 'home-answer');
window.setHomeAsk = function(text) {
    document.getElementById('home-ask-input').value = text;
    document.getElementById('home-ask-btn').click();
};

// Notes
setupInput('notes-input', 'notes-btn', 'notes', 'notes-answer');

// Planner
setupInput('planner-input', 'planner-btn', 'planner', 'planner-answer');

// Quick Help
setupInput('qh-input', 'qh-btn', 'quick-help', 'qh-answer');

// MCQs
setupInput('mcq-input', 'mcq-btn', 'mcq', 'mcq-answer');

// =========================================
// PDF SUMMARIZER
// =========================================

const pdfInput = document.getElementById('pdf-file-input');
const pdfNameDisplay = document.getElementById('pdf-file-name');
const pdfBtn = document.getElementById('pdf-summarize-btn');
const pdfClearBtn = document.getElementById('pdf-clear-btn');
const pdfAnswer = document.getElementById('pdf-answer');

if(pdfInput && pdfBtn) {
    pdfInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            const file = e.target.files[0];
            pdfNameDisplay.textContent = file.name;
            pdfNameDisplay.style.color = 'var(--primary)';
            pdfNameDisplay.style.fontWeight = '600';
            pdfBtn.disabled = false;
            pdfClearBtn.style.display = 'block';
        } else {
            resetPdfUI();
        }
    });

    pdfClearBtn.addEventListener('click', () => {
        resetPdfUI();
        pdfAnswer.innerHTML = '';
        pdfAnswer.style.display = 'none';
    });

    function resetPdfUI() {
        pdfInput.value = '';
        pdfNameDisplay.textContent = 'Click to select a PDF file';
        pdfNameDisplay.style.color = 'var(--text-main)';
        pdfNameDisplay.style.fontWeight = '500';
        pdfBtn.disabled = true;
        pdfClearBtn.style.display = 'none';
    }

    pdfBtn.addEventListener('click', async () => {
        if(pdfInput.files.length === 0) return;
        
        const file = pdfInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        const originalText = pdfBtn.textContent;
        pdfBtn.disabled = true;
        pdfBtn.textContent = "Uploading & Reading...";
        pdfAnswer.style.display = "block";
        pdfAnswer.innerHTML = '<div class="loading-indicator">StudyFlow is reading your PDF...</div>';

        try {
            const response = await fetch(`${API_BASE}/summarize-pdf`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                pdfAnswer.innerHTML = `<p style='padding:16px; color:var(--error); font-weight:600;'>Error: ${errData.error || 'Something went wrong.'}</p>`;
            } else {
                const data = await response.json();
                displayNormalAnswer(data.answer, pdfAnswer);
                logActivity(`Summarized PDF: ${file.name}`);
                userData.sessions++;
                addXP(20); // Bonus XP for reading a PDF
            }
        } catch (error) {
            pdfAnswer.innerHTML = "<p style='padding:16px;'>Network error. Please make sure the server is running.</p>";
            console.error(error);
        } finally {
            pdfBtn.disabled = false;
            pdfBtn.textContent = originalText;
        }
    });
}

// =========================================
// INTERACTIVE MCQ SYSTEM
// =========================================

let currentQuiz = {
    questions: [],
    index: 0,
    score: 0,
    topic: "",
    container: null
};

function startMCQQuiz(questions, topic, container) {
    currentQuiz.questions = questions;
    currentQuiz.index = 0;
    currentQuiz.score = 0;
    currentQuiz.topic = topic;
    currentQuiz.container = container;
    renderMCQQuestion();
}

function renderMCQQuestion() {
    const { questions, index, container } = currentQuiz;
    container.innerHTML = "";
    
    if (index >= questions.length) {
        renderMCQResults();
        return;
    }
    
    const qData = questions[index];
    
    const card = document.createElement("div");
    card.className = "quiz-card";
    
    const progress = document.createElement("div");
    progress.className = "quiz-progress";
    progress.textContent = `Question ${index + 1} of ${questions.length}`;
    
    const question = document.createElement("h3");
    question.textContent = qData.question;
    
    card.appendChild(progress);
    card.appendChild(question);
    
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "quiz-options-container";
    
    let answered = false;
    
    qData.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = `${opt.letter}) ${opt.text}`;
        
        btn.addEventListener("click", () => {
            if (answered) return;
            answered = true;
            
            const isCorrect = (opt.letter === qData.correctAnswer);
            if (isCorrect) {
                btn.classList.add("correct");
                currentQuiz.score++;
                userData.mcqsSolved++;
                addXP(5);
            } else {
                btn.classList.add("wrong");
                Array.from(optionsContainer.children).forEach(childBtn => {
                    if (childBtn.textContent.startsWith(qData.correctAnswer + ")")) {
                        childBtn.classList.add("correct");
                    }
                });
            }
            saveData(userData);
            
            const exp = document.createElement("div");
            exp.className = "quiz-explanation";
            exp.innerHTML = `<strong>${isCorrect ? '? Correct!' : '? Incorrect.'}</strong> ${qData.explanation}`;
            card.appendChild(exp);
            
            const nextBtn = document.createElement("button");
            nextBtn.className = "quiz-next-btn";
            nextBtn.textContent = (index === questions.length - 1) ? "View Results ?" : "Next Question ?";
            nextBtn.addEventListener("click", () => {
                currentQuiz.index++;
                renderMCQQuestion();
            });
            card.appendChild(nextBtn);
        });
        
        optionsContainer.appendChild(btn);
    });
    
    card.appendChild(optionsContainer);
    container.appendChild(card);
}

function renderMCQResults() {
    const { questions, score, topic, container } = currentQuiz;
    const incorrect = questions.length - score;
    
    // Track weak topic if bad score
    if(score < 3) {
        const exists = userData.weakTopics.find(w => w.topic.toLowerCase() === topic.toLowerCase());
        if(exists) {
            exists.attempts++;
            exists.accuracy = Math.round((exists.attempts > 1 ? (parseInt(exists.accuracy) + (score/5*100))/2 : (score/5*100))) + "%";
        } else {
            userData.weakTopics.push({ topic: topic, attempts: 1, accuracy: (score/5*100) + "%" });
        }
        saveData(userData);
    }
    
    container.innerHTML = `
        <div class="quiz-card" style="text-align: center; padding: 32px 20px;">
            <h3 style="font-size: 14px; margin-bottom: 8px; color: var(--text-sec); text-transform: uppercase; letter-spacing: 1px;">Your Score</h3>
            <div style="font-size: 36px; font-weight: 800; color: var(--primary); margin-bottom: 24px;">${score} / ${questions.length}</div>
            
            <div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 32px; font-size: 13px;">
                <div><strong style="color: var(--success);">${score}</strong> Correct</div>
                <div><strong style="color: var(--error);">${incorrect}</strong> Incorrect</div>
            </div>
            
            <div style="display: flex; justify-content: center; gap: 12px;">
                <button class="quiz-next-btn" onclick="retryQuiz()">Try Again</button>
            </div>
        </div>
    `;
}

window.retryQuiz = function() {
    document.getElementById('mcq-input').value = currentQuiz.topic;
    document.getElementById('mcq-btn').click();
};

// =========================================
// INIT
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
});

// =========================================
// MATHS SOLVER
// =========================================
const msBtn = document.getElementById('ms-btn');
if (msBtn) {
    msBtn.addEventListener('click', () => {
        const input = document.getElementById('ms-input').value.trim();
        fetchAIResponse(input, 'maths-solver', msBtn, document.getElementById('ms-answer'));
    });
}

// =========================================
// CODE HELPER
// =========================================
const chBtn = document.getElementById('ch-btn');
if (chBtn) {
    chBtn.addEventListener('click', async () => {
        const lang = document.getElementById('ch-lang').value.trim();
        const action = document.getElementById('ch-action').value;
        const input = document.getElementById('ch-input').value.trim();
        const answerEl = document.getElementById('ch-answer');
        
        if (!input) return;
        
        const origText = chBtn.textContent;
        chBtn.textContent = 'Thinking...';
        chBtn.disabled = true;
        answerEl.style.display = 'block';
        answerEl.innerHTML = '<div class="loading-indicator">StudyFlow is thinking...</div>';
        
        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ question: input, mode: "code-helper", language: lang, action: action })
            });
            const data = await res.json();
            displayNormalAnswer(data.answer, answerEl);
            addXP(10);
        } catch(e) {
            answerEl.innerHTML = "<p style='padding:16px;'>Network error.</p>";
        } finally {
            chBtn.textContent = origText;
            chBtn.disabled = false;
        }
    });
}

// =========================================
// ASK MY NOTES
// =========================================
let latestNotes = localStorage.getItem('studyFlowLatestNotes') || "";
if (latestNotes && document.getElementById('ask-notes-status')) {
    document.getElementById('ask-notes-status').textContent = "Ready to answer questions about your last generated notes.";
    document.getElementById('ask-notes-status').style.color = "var(--success)";
}

const amnBtn = document.getElementById('ask-notes-btn');
if (amnBtn) {
    amnBtn.addEventListener('click', async () => {
        const input = document.getElementById('ask-notes-input').value.trim();
        const answerEl = document.getElementById('ask-notes-answer');
        
        if (!input) return;
        if (!latestNotes) {
            answerEl.style.display = 'block';
            answerEl.innerHTML = "<p style='padding:16px;'>Please generate some notes in the AI Notes tab first.</p>";
            return;
        }
        
        const origText = amnBtn.textContent;
        amnBtn.textContent = 'Thinking...';
        amnBtn.disabled = true;
        answerEl.style.display = 'block';
        answerEl.innerHTML = '<div class="loading-indicator">Reading your notes...</div>';
        
        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ question: input, mode: "ask-my-notes", notes: latestNotes })
            });
            const data = await res.json();
            displayNormalAnswer(data.answer, answerEl);
            addXP(5);
        } catch(e) {
            answerEl.innerHTML = "<p style='padding:16px;'>Network error.</p>";
        } finally {
            amnBtn.textContent = origText;
            amnBtn.disabled = false;
        }
    });
}

// =========================================
// FLASHCARDS
// =========================================
let currentFlashcards = [];
let fcIndex = 0;
let fcShowingFront = true;

const fcBtn = document.getElementById('fc-btn');
if (fcBtn) {
    fcBtn.addEventListener('click', async () => {
        const input = document.getElementById('fc-input').value.trim();
        if (!input) return;
        
        document.getElementById('fc-loading').style.display = 'block';
        document.getElementById('fc-container').style.display = 'none';
        fcBtn.disabled = true;
        
        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ question: input, mode: "flashcards" })
            });
            const data = await res.json();
            if (data.isJson && data.answer.cards) {
                currentFlashcards = data.answer.cards;
                fcIndex = 0;
                renderFlashcard();
                document.getElementById('fc-container').style.display = 'block';
                addXP(10);
            } else {
                document.getElementById('fc-loading').innerHTML = "<p style='padding:16px;'>Failed to generate flashcards.</p>";
            }
        } catch(e) {
            document.getElementById('fc-loading').innerHTML = "<p style='padding:16px;'>Network error.</p>";
        } finally {
            document.getElementById('fc-loading').style.display = 'none';
            fcBtn.disabled = false;
        }
    });
    
    document.getElementById('fc-flip').addEventListener('click', () => {
        fcShowingFront = !fcShowingFront;
        const textDiv = document.getElementById('fc-text');
        textDiv.style.opacity = 0;
        setTimeout(() => {
            textDiv.textContent = fcShowingFront ? currentFlashcards[fcIndex].front : currentFlashcards[fcIndex].back;
            document.getElementById('fc-card').style.background = fcShowingFront ? "var(--card-bg)" : "rgba(128, 0, 0, 0.03)";
            textDiv.style.opacity = 1;
        }, 150);
    });
    
    document.getElementById('fc-next').addEventListener('click', () => {
        if (fcIndex < currentFlashcards.length - 1) {
            fcIndex++;
            renderFlashcard();
        }
    });
    
    document.getElementById('fc-prev').addEventListener('click', () => {
        if (fcIndex > 0) {
            fcIndex--;
            renderFlashcard();
        }
    });
}

function renderFlashcard() {
    fcShowingFront = true;
    document.getElementById('fc-progress').textContent = `Card ${fcIndex + 1} of ${currentFlashcards.length}`;
    const textDiv = document.getElementById('fc-text');
    textDiv.textContent = currentFlashcards[fcIndex].front;
    textDiv.style.transition = "opacity 0.15s";
    document.getElementById('fc-card').style.background = "var(--card-bg)";
    
    document.getElementById('fc-prev').disabled = fcIndex === 0;
    document.getElementById('fc-next').disabled = fcIndex === currentFlashcards.length - 1;
}

// =========================================
// ANSWER PRACTICE
// =========================================
let apCurrentQuestion = "";

const apBtn = document.getElementById('ap-btn');
if (apBtn) {
    apBtn.addEventListener('click', async () => {
        const topic = document.getElementById('ap-input').value.trim();
        const diff = document.getElementById('ap-diff').value;
        if (!topic) return;
        
        apBtn.disabled = true;
        apBtn.textContent = 'Generating...';
        
        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ question: topic, context: diff, mode: "answer-practice-q" })
            });
            const data = await res.json();
            apCurrentQuestion = data.answer;
            document.getElementById('ap-question-text').textContent = apCurrentQuestion;
            document.getElementById('ap-answer-input').value = '';
            document.getElementById('ap-workspace').style.display = 'block';
            document.getElementById('ap-feedback').style.display = 'none';
        } catch(e) {
            alert('Failed to get question');
        } finally {
            apBtn.disabled = false;
            apBtn.textContent = 'Get Question';
        }
    });
    
    document.getElementById('ap-submit-btn').addEventListener('click', async () => {
        const answer = document.getElementById('ap-answer-input').value.trim();
        if (!answer) return;
        
        const subBtn = document.getElementById('ap-submit-btn');
        subBtn.disabled = true;
        subBtn.textContent = 'Evaluating...';
        
        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ question: answer, context: apCurrentQuestion, mode: "answer-practice-eval" })
            });
            const data = await res.json();
            if (data.isJson) {
                const fb = data.answer;
                const fbDiv = document.getElementById('ap-feedback');
                fbDiv.style.display = 'block';
                fbDiv.innerHTML = `
                    <div class="dashboard-card" style="border-left: 4px solid var(--primary);">
                        <div style="font-size: 24px; font-weight: 800; color: var(--primary); margin-bottom: 12px;">Score: ${fb.score}</div>
                        <p><strong>Correct:</strong> ${fb.correct}</p>
                        <p style="margin-top:8px;"><strong>Missing:</strong> ${fb.missing}</p>
                        <div style="margin-top:16px; padding: 12px; background: rgba(34, 197, 94, 0.05); border: 1px solid var(--success); border-radius: 6px;">
                            <p style="font-size: 12px; color: var(--success); font-weight: bold; margin-bottom: 4px;">Improved Answer Example:</p>
                            ${fb.improved}
                        </div>
                        <p style="margin-top:12px; font-size: 12px; color: var(--text-sec);">${fb.explanation}</p>
                    </div>
                `;
                addXP(15);
            }
        } catch(e) {
            alert('Failed to evaluate');
        } finally {
            subBtn.disabled = false;
            subBtn.textContent = 'Submit for Review';
        }
    });
}

// =========================================
// MOCK TEST
// =========================================
let mtData = null;

const mtBtn = document.getElementById('mt-btn');
if (mtBtn) {
    mtBtn.addEventListener('click', async () => {
        const topic = document.getElementById('mt-input').value.trim();
        if (!topic) return;
        
        document.getElementById('mt-loading').style.display = 'block';
        document.getElementById('mt-workspace').style.display = 'none';
        mtBtn.disabled = true;
        
        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ question: topic, mode: "mock-test-gen" })
            });
            const data = await res.json();
            if (data.isJson) {
                mtData = data.answer;
                renderMockTest();
                document.getElementById('mt-workspace').style.display = 'block';
                addXP(5);
            }
        } catch(e) {
            document.getElementById('mt-loading').innerHTML = "<p>Network error.</p>";
        } finally {
            document.getElementById('mt-loading').style.display = 'none';
            mtBtn.disabled = false;
        }
    });
}

function renderMockTest() {
    const ws = document.getElementById('mt-workspace');
    let html = `<div class="dashboard-card" style="padding: 32px;"><h3 style="font-size: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 24px;">Section 1: Multiple Choice</h3>`;
    
    mtData.mcqs.forEach((mcq, idx) => {
        html += `<div style="margin-bottom: 24px;" class="mt-mcq-item">
            <p style="font-weight: 600; margin-bottom: 12px;">${idx + 1}. ${mcq.question}</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${mcq.options.map(opt => `
                    <label style="display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                        <input type="radio" name="mt-mcq-${idx}" value="${opt.letter}" />
                        ${opt.letter}) ${opt.text}
                    </label>
                `).join('')}
            </div>
        </div>`;
    });
    
    html += `<h3 style="font-size: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 24px; margin-top: 48px;">Section 2: Short Answer</h3>`;
    
    mtData.short_answers.forEach((sa, idx) => {
        html += `<div style="margin-bottom: 24px;" class="mt-sa-item">
            <p style="font-weight: 600; margin-bottom: 12px;">${idx + 1}. ${sa.question}</p>
            <textarea id="mt-sa-${idx}" rows="3" style="width: 100%; border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; font-family: inherit; font-size: 14px; outline: none;"></textarea>
        </div>`;
    });
    
    html += `<button id="mt-submit-btn" class="primary-btn" style="width: 100%; padding: 14px; font-size: 16px; margin-top: 24px;">Submit Test</button>`;
    html += `</div><div id="mt-results" class="mt-4" style="display:none;"></div>`;
    
    ws.innerHTML = html;
    
    document.getElementById('mt-submit-btn').addEventListener('click', evaluateMockTest);
}

async function evaluateMockTest() {
    const subBtn = document.getElementById('mt-submit-btn');
    subBtn.disabled = true;
    subBtn.textContent = 'Grading Test...';
    
    let mcqScore = 0;
    mtData.mcqs.forEach((mcq, idx) => {
        const selected = document.querySelector(`input[name="mt-mcq-${idx}"]:checked`);
        if (selected && selected.value === mcq.correctAnswer) {
            mcqScore++;
        }
    });
    
    const shortAnswers = mtData.short_answers.map((sa, idx) => ({
        question: sa.question,
        answer: document.getElementById(`mt-sa-${idx}`).value.trim()
    }));
    
    try {
        const res = await fetch(`${API_BASE}/ask`, {
            method: "POST", headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ question: JSON.stringify(shortAnswers), mode: "mock-test-eval" })
        });
        const data = await res.json();
        
        let html = `<div class="dashboard-card" style="border-left: 4px solid var(--primary);">
            <div style="font-size: 24px; font-weight: 800; color: var(--primary); margin-bottom: 12px;">MCQ Score: ${mcqScore} / ${mtData.mcqs.length}</div>`;
            
        if (data.isJson && data.answer.evaluations) {
            html += `<h4 style="margin-top: 24px; margin-bottom: 12px;">Short Answer Evaluations:</h4>`;
            data.answer.evaluations.forEach((ev, idx) => {
                html += `<div style="margin-bottom: 16px; padding: 12px; background: rgba(128, 0, 0, 0.02); border-radius: 6px;">
                    <p style="font-weight: 600;">Q: ${shortAnswers[idx].question}</p>
                    <p style="color: var(--text-sec); margin-top: 4px;">Your Answer: ${shortAnswers[idx].answer || '(No answer)'}</p>
                    <p style="color: var(--primary); font-weight: 600; margin-top: 8px;">Score: ${ev.score}</p>
                    <p style="font-size: 12px; margin-top: 4px;">${ev.feedback}</p>
                </div>`;
            });
        }
        html += `</div>`;
        document.getElementById('mt-results').innerHTML = html;
        document.getElementById('mt-results').style.display = 'block';
        addXP(50);
        window.scrollTo(0, document.body.scrollHeight);
    } catch(e) {
        alert('Failed to grade test');
    } finally {
        subBtn.style.display = 'none';
    }
}

// Add Enter key support for new forms
document.getElementById('fc-input')?.addEventListener('keypress', (e) => { if(e.key === 'Enter') document.getElementById('fc-btn').click(); });
document.getElementById('ap-input')?.addEventListener('keypress', (e) => { if(e.key === 'Enter') document.getElementById('ap-btn').click(); });
document.getElementById('mt-input')?.addEventListener('keypress', (e) => { if(e.key === 'Enter') document.getElementById('mt-btn').click(); });
document.getElementById('ask-notes-input')?.addEventListener('keypress', (e) => { if(e.key === 'Enter') document.getElementById('ask-notes-btn').click(); });

// =========================================
// IMAGE TO QUESTION
// =========================================
const iqInput = document.getElementById('iq-file');
const iqNameDisplay = document.getElementById('iq-file-name');
const iqBtn = document.getElementById('iq-btn');
const iqClearBtn = document.getElementById('iq-clear-btn');
const iqAnswer = document.getElementById('iq-answer');
const iqAction = document.getElementById('iq-action');

if(iqInput && iqBtn) {
    iqInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            const file = e.target.files[0];
            iqNameDisplay.textContent = file.name;
            iqNameDisplay.style.color = 'var(--primary)';
            iqNameDisplay.style.fontWeight = '600';
            iqBtn.disabled = false;
            iqClearBtn.style.display = 'block';
        }
    });

    iqClearBtn.addEventListener('click', () => {
        iqInput.value = '';
        iqNameDisplay.textContent = 'Click to upload an image (JPG/PNG)';
        iqNameDisplay.style.color = '';
        iqNameDisplay.style.fontWeight = 'normal';
        iqBtn.disabled = true;
        iqClearBtn.style.display = 'none';
        iqAnswer.innerHTML = '';
        iqAnswer.style.display = 'none';
    });

    iqBtn.addEventListener('click', async () => {
        if(iqInput.files.length === 0) return;
        
        const file = iqInput.files[0];
        const action = iqAction.value;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('action', action);

        const originalText = iqBtn.textContent;
        iqBtn.disabled = true;
        iqBtn.textContent = "Analyzing image...";
        iqAnswer.style.display = "block";
        iqAnswer.innerHTML = '<div class="loading-indicator">StudyFlow is analyzing your image...</div>';

        try {
            const response = await fetch(`${API_BASE}/image-q`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                iqAnswer.innerHTML = `<p style='padding:16px; color: var(--error);'>${err.error || "Something went wrong."}</p>`;
            } else {
                const data = await response.json();
                displayNormalAnswer(data.answer, iqAnswer);
                addXP(20);
                logActivity(`Analyzed image: ${file.name}`);
            }
        } catch (error) {
            iqAnswer.innerHTML = "<p style='padding:16px;'>Network Error. Please make sure the backend is running.</p>";
            console.error(error);
        } finally {
            iqBtn.disabled = false;
            iqBtn.textContent = originalText;
        }
    });
}

// =========================================
// VOICE TUTOR
// =========================================
const vtMicBtn = document.getElementById('vt-mic-btn');
const vtStatus = document.getElementById('vt-status');
const vtInput = document.getElementById('vt-input');
const vtSendBtn = document.getElementById('vt-send-btn');
const vtAnswer = document.getElementById('vt-answer');

if (vtMicBtn) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            isListening = true;
            vtStatus.textContent = "Listening... Speak now.";
            vtMicBtn.style.transform = "scale(1.2)";
            vtMicBtn.style.boxShadow = "0 0 15px var(--primary)";
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            vtInput.value = transcript;
            vtStatus.textContent = "Click the microphone to start speaking...";
            vtSendBtn.click();
        };
        
        recognition.onerror = (event) => {
            vtStatus.textContent = "Error: " + event.error;
        };
        
        recognition.onend = () => {
            isListening = false;
            vtMicBtn.style.transform = "scale(1)";
            vtMicBtn.style.boxShadow = "0 4px 12px rgba(128,0,0,0.2)";
            if(vtStatus.textContent.includes("Listening")) {
                vtStatus.textContent = "Click the microphone to start speaking...";
            }
        };
        
        vtMicBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        vtStatus.textContent = "Voice recognition is not supported in this browser. You can still type below.";
        vtMicBtn.style.display = "none";
    }

    vtSendBtn.addEventListener('click', async () => {
        const question = vtInput.value.trim();
        if (!question) return;
        
        const origText = vtSendBtn.textContent;
        vtSendBtn.textContent = 'Thinking...';
        vtSendBtn.disabled = true;
        vtAnswer.style.display = 'block';
        vtAnswer.innerHTML = '<div class="loading-indicator">StudyFlow is thinking...</div>';
        
        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ question: question, mode: "normal" })
            });
            const data = await res.json();
            displayNormalAnswer(data.answer, vtAnswer);
            addXP(10);
            logActivity(`Voice Tutor used`);
            
            // Text to speech
            if ('speechSynthesis' in window) {
                // Strip markdown for speaking
                let plainText = data.answer.replace(/[#*`_]/g, '');
                const utterance = new SpeechSynthesisUtterance(plainText);
                speechSynthesis.speak(utterance);
            }
        } catch(e) {
            vtAnswer.innerHTML = "<p style='padding:16px;'>Network error.</p>";
        } finally {
            vtSendBtn.textContent = origText;
            vtSendBtn.disabled = false;
        }
    });

    vtInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') vtSendBtn.click();
    });
}
