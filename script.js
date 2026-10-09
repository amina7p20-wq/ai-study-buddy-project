const API_BASE = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000" : "";


// =========================================
// FIREBASE INITIALIZATION & AUTH
// =========================================
const firebaseConfig = {
  apiKey: "AIzaSyA5-2MfA6an1gI5l-9GxNfmpdaHZ_8FEG4",
  authDomain: "studyflow-amina.firebaseapp.com",
  projectId: "studyflow-amina",
  storageBucket: "studyflow-amina.firebasestorage.app",
  messagingSenderId: "954250301378",
  appId: "1:954250301378:web:4eeb27d002e62c4464905b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// Keep defaults for complex UI stuff, but XP/Activity/Sessions come from Firebase
const defaultData = {
    streak: { current: 3, longest: 7, days: [] },
    progress: { completion: 15, xp: 0, totalTime: 12 },
    schedule: [
        { day: 'Today', task: 'Python - Functions', status: 'pending' },
        { day: 'Tomorrow', task: 'DBMS - Normalization', status: 'pending' },
        { day: 'Upcoming', task: 'Java - OOP', status: 'pending' }
    ],
    recentActivity: [],
    weakTopics: [
        { topic: "Inheritance in Java", attempts: 3, accuracy: "40%" },
        { topic: "SQL Joins", attempts: 2, accuracy: "50%" }
    ],
    continueLearning: [
        { subject: "Python", progress: 60, icon: "💻" },
        { subject: "DBMS", progress: 30, icon: "📊" },
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
    sessions: 0
};

let userData = JSON.parse(JSON.stringify(defaultData));

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-wrapper').style.display = 'none';
        const sidebarEl = document.getElementById('sidebar');
        if (sidebarEl) sidebarEl.style.display = 'flex';
        const mainEl = document.getElementById('app-main');
        if (mainEl) mainEl.style.display = 'flex';
        
        let dName = user.displayName;
        if (!dName) {
            const d = await db.collection('users').doc(user.uid).get();
            if (d.exists && d.data().name) {
                dName = d.data().name;
            } else if (user.email) {
                dName = user.email.split('@')[0];
            } else {
                dName = 'Student';
            }
        }
        
        const nameSpans = document.querySelectorAll('.profile-name');
        nameSpans.forEach(span => span.textContent = dName);
        
        const avatarDivs = document.querySelectorAll('.profile-avatar');
        avatarDivs.forEach(avatarDiv => {
            if (user.photoURL) {
                avatarDiv.innerHTML = `<img src="${user.photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                avatarDiv.textContent = dName.charAt(0).toUpperCase();
            }
        });
        
        // Also update greeting
        const greetingEl = document.getElementById('user-greeting');
        if (greetingEl) {
            greetingEl.textContent = `Hello, ${dName}!`;
        }

        
        await loadUserData();
        // Since the user is authenticated, we render the dashboard normally
        if (typeof navigate === 'function') navigate('home');
    } else {
        currentUser = null;
        document.getElementById('auth-wrapper').style.display = 'flex';
        const sidebarEl = document.getElementById('sidebar');
        if (sidebarEl) sidebarEl.style.display = 'none';
        const mainEl = document.getElementById('app-main');
        if (mainEl) mainEl.style.display = 'none';
    }
});

// Auth UI Logic
const authErr = document.getElementById('auth-error');
const setAuthError = (msg) => { authErr.textContent = msg; };

document.getElementById('auth-switch-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('auth-login-form').style.display = 'none';
    document.getElementById('auth-signup-form').style.display = 'block';
    setAuthError('');
});

document.getElementById('auth-switch-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('auth-signup-form').style.display = 'none';
    document.getElementById('auth-login-form').style.display = 'block';
    setAuthError('');
});

document.getElementById('auth-login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if(!email || !password) return setAuthError('Please fill all fields');
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch(e) { setAuthError(e.message); }
});

document.getElementById('auth-signup-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('auth-name-up').value;
    const email = document.getElementById('auth-email-up').value;
    const password = document.getElementById('auth-password-up').value;
    if(!name || !email || !password) return setAuthError('Please fill all fields');
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        await db.collection('users').doc(cred.user.uid).set({
            uid: cred.user.uid,
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            xp: 0,
            sessions: 0
        });
        auth.updateCurrentUser(cred.user);
    } catch(e) { setAuthError(e.message); }
});

document.getElementById('auth-google-btn')?.addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        const userRef = db.collection('users').doc(result.user.uid);
        const doc = await userRef.get();
        if (!doc.exists) {
            await userRef.set({
                uid: result.user.uid,
                name: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                xp: 0,
                sessions: 0
            });
        }
    } catch(e) { setAuthError(e.message); }
});

document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut();
});

// =========================================
// DATA & STATE MANAGEMENT (Firestore)
// =========================================
async function loadUserData() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            userData.progress.xp = data.xp || 0;
            userData.sessions = data.sessions || 0;
            userData.weakTopics = data.weakTopics || userData.weakTopics;
        }
        
        
        const activitySnapshot = await db.collection('users').doc(currentUser.uid).collection('activity')
            .orderBy('timestamp', 'desc').limit(10).get();
        userData.recentActivity = activitySnapshot.docs.map(d => ({ text: d.data().text, date: d.data().date }));
        
        let unreadCount = 0;
        const listEl = document.getElementById('notif-list');
        if (listEl) {
            listEl.innerHTML = '';
            if (activitySnapshot.empty) {
                listEl.innerHTML = '<p style="color:var(--text-sec); padding:8px;">No notifications yet.</p>';
            } else {
                activitySnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.read === false) unreadCount++;
                    listEl.innerHTML += `<div class="notif-item">
                        <span>${data.text}</span>
                        <span class="notif-time">${data.date}</span>
                    </div>`;
                });
            }
        }
        
        const badge = document.getElementById('notif-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        console.error("Error loading user data:", e);
    }
}

async function addXP(amount) {
    if (!currentUser) return;
    userData.progress.xp += amount;
    userData.sessions += 1;
    if(typeof renderProgressStats === 'function') renderProgressStats();
    if(typeof renderDashboard === 'function') renderDashboard();
    try {
        await db.collection('users').doc(currentUser.uid).update({
            xp: firebase.firestore.FieldValue.increment(amount),
            sessions: firebase.firestore.FieldValue.increment(1)
        });
    } catch (e) { console.error("XP update failed", e); }
}

async function logActivity(text) {
    if (!currentUser) return;
    const act = { text, date: new Date().toLocaleDateString(), timestamp: firebase.firestore.FieldValue.serverTimestamp(), read: false };
    userData.recentActivity.unshift({ text, date: act.date });
    if(userData.recentActivity.length > 5) userData.recentActivity.pop();
    if(typeof renderRecentActivity === 'function') renderRecentActivity(); loadUserData();
    try {
        await db.collection('users').doc(currentUser.uid).collection('activity').add(act);
    } catch (e) { console.error("Activity log failed", e); }
}

async function saveToolData(toolName, dataObj) {
    if (!currentUser) return;
    try {
        dataObj.timestamp = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(currentUser.uid).collection(toolName).add(dataObj);
    } catch (e) { console.error("Failed to save tool data", e); }
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
                    /* localStorage removed */
                if (mode === "notes") {
                    saveToolData("generated_notes", { topic: document.getElementById('search-input').value || "AI Notes", content: data.answer });
                }
                if (mode === "planner") {
                    saveToolData("planner", { topic: document.getElementById('search-input').value, content: data.answer });
                }
                if (mode === "mcq") {
                    saveToolData("mcqs", { topic: document.getElementById('search-input').value, content: data.answer });
                }


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
    const handlePdf = (file) => {
        pdfNameDisplay.textContent = file.name;
        pdfNameDisplay.style.color = 'var(--primary)';
        pdfBtn.disabled = false;
        if(pdfClearBtn) pdfClearBtn.style.display = 'block';
    };

    pdfInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) handlePdf(e.target.files[0]);
    });

    if(pdfClearBtn) {
        pdfClearBtn.addEventListener('click', () => {
            pdfInput.value = '';
            pdfNameDisplay.textContent = 'Click to select a PDF file';
            pdfNameDisplay.style.color = 'var(--text-sec)';
            pdfBtn.disabled = true;
            pdfClearBtn.style.display = 'none';
            if(pdfAnswer) {
                pdfAnswer.innerHTML = '';
                pdfAnswer.style.display = 'none';
            }
        });
    }

    pdfBtn.addEventListener('click', async () => {
        if(pdfInput.files.length === 0) return;
        const file = pdfInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        pdfBtn.disabled = true;
        pdfBtn.innerHTML = 'Summarizing...';
        pdfAnswer.style.display = 'block';
        pdfAnswer.innerHTML = `<div class="loading-indicator">Summarizing PDF...</div>`;
        
        try {
            const res = await fetch(`${API_BASE}/summarize-pdf`, { method: 'POST', body: formData });
            const data = await res.json();
            if(data.summary) {
                pdfAnswer.innerHTML = `<div class="dashboard-card" style="margin-top:20px;">` + marked.parse(data.summary) + `</div>`;
                appendToolControls(pdfAnswer, file.name, "pdf");
                if(typeof saveToolData === 'function') saveToolData("pdf_summaries", { fileName: file.name, summary: data.summary });
                if(typeof addXP === 'function') addXP(30);
                if(typeof logActivity === 'function') logActivity("Summarized a PDF");
            } else {
                pdfAnswer.innerHTML = `<div class="error-msg"><strong>Error:</strong> ${data.error}</div>`;
            }
        } catch(e) {
            pdfAnswer.innerHTML = "<div class='error-msg'><strong>Connection Error:</strong> Failed to summarize PDF.</div>";
        } finally {
            pdfBtn.disabled = false;
            pdfBtn.innerHTML = 'Summarize PDF';
        }
    });
}
const iqInput = document.getElementById('iq-file');
const iqNameDisplay = document.getElementById('iq-file-name');
const iqBtn = document.getElementById('iq-btn');
const iqClearBtn = document.getElementById('iq-clear-btn');
const iqAnswer = document.getElementById('iq-answer');
const iqPreview = document.getElementById('iq-preview');

if (iqInput && iqBtn) {
    const handleFile = (file) => {
        iqNameDisplay.textContent = file.name;
        iqBtn.disabled = false;
        iqClearBtn.style.display = 'block';
        const reader = new FileReader();
        reader.onload = (e) => {
            iqPreview.src = e.target.result;
            iqPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    };

    iqInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) handleFile(e.target.files[0]);
    });
    
    // Drag and drop
    const dropZone = iqInput.closest('.file-upload-box');
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--border-color)'; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        if(e.dataTransfer.files.length > 0) {
            iqInput.files = e.dataTransfer.files;
            handleFile(e.dataTransfer.files[0]);
        }
    });

    iqClearBtn.addEventListener('click', () => {
        iqInput.value = '';
        iqNameDisplay.textContent = 'Click to upload an image (JPG/PNG)';
        iqPreview.src = '';
        iqPreview.style.display = 'none';
        iqBtn.disabled = true;
        iqClearBtn.style.display = 'none';
        iqAnswer.innerHTML = '';
        iqAnswer.style.display = 'none';
    });

    iqBtn.addEventListener('click', async () => {
        if(iqInput.files.length === 0) return;
        const file = iqInput.files[0];
        const action = document.getElementById('iq-action').value;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('action', action);
        
        iqBtn.disabled = true;
        iqBtn.innerHTML = 'Analyzing...';
        iqAnswer.style.display = 'block';
        iqAnswer.innerHTML = `<div class="loading-indicator">Analyzing Image...</div>`;
        
        try {
            const res = await fetch(`${API_BASE}/image-q`, { method: 'POST', body: formData });
            const data = await res.json();
            if(data.answer) {
                iqAnswer.innerHTML = `<div class="dashboard-card" style="margin-top:20px;">` + marked.parse(data.answer) + `</div>`;
                appendToolControls(iqAnswer, file.name, "image-q");
                if(typeof addXP === 'function') addXP(20);
                if(typeof logActivity === 'function') logActivity("Analyzed image");
            } else {
                iqAnswer.innerHTML = `<div class="error-msg"><strong>Error:</strong> ${data.error}</div>`;
            }
        } catch(e) {
            iqAnswer.innerHTML = "<div class='error-msg'><strong>Connection Error:</strong> Failed to process image.</div>";
        } finally {
            iqBtn.disabled = false;
            iqBtn.innerHTML = 'Analyze Image';
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


// =========================================
// NOTIFICATIONS EVENT LISTENERS
// =========================================
const notifBtn = document.getElementById('notif-btn');
if (notifBtn) {
    notifBtn.addEventListener('click', async () => {
        const dropdown = document.getElementById('notif-dropdown');
        if (!dropdown) return;
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        
        if (dropdown.style.display === 'block' && currentUser) {
            try {
                const unreadDocs = await db.collection('users').doc(currentUser.uid).collection('activity').where('read', '==', false).get();
                if (!unreadDocs.empty) {
                    const batch = db.batch();
                    unreadDocs.forEach(doc => {
                        batch.update(doc.ref, {read: true});
                    });
                    await batch.commit();
                    const badge = document.getElementById('notif-badge');
                    if (badge) badge.style.display = 'none';
                }
            } catch (e) {
                console.error("Error marking notifs as read:", e);
            }
        }
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.notification-wrapper')) {
        const dropdown = document.getElementById('notif-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});


function appendToolControls(answerEl, promptStr, mode) {
    const controls = document.createElement('div');
    controls.className = 'tool-controls';
    controls.style.cssText = 'display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; flex-wrap: wrap;';
    
    // Escape prompt string safely for HTML injection
    const safePrompt = String(promptStr).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    controls.innerHTML = `
        <button class="secondary-btn btn-sm copy-btn" onclick="copyResult(this)" style="padding: 6px 12px; font-size:12px; background:transparent; border:1px solid var(--primary); color:var(--primary); cursor:pointer; border-radius:4px;">Copy Response</button>
        <button class="secondary-btn btn-sm" onclick="regenerateResponse(this, '${safePrompt}', '${mode}')" style="padding: 6px 12px; font-size:12px; background:transparent; border:1px solid var(--primary); color:var(--primary); cursor:pointer; border-radius:4px;">Regenerate</button>
        <button class="secondary-btn btn-sm" onclick="clearCurrent(this)" style="padding: 6px 12px; font-size:12px; background:transparent; border:1px solid var(--text-sec); color:var(--text-sec); cursor:pointer; border-radius:4px;">Clear</button>
        <button class="primary-btn btn-sm" onclick="newChat(this)" style="padding: 6px 12px; font-size:12px; border:none; cursor:pointer; border-radius:4px;">New Chat</button>
    `;
    answerEl.appendChild(controls);
}

window.regenerateResponse = function(btn, promptStr, mode) {
    const page = btn.closest('.page');
    if (page) {
        const input = page.querySelector('input[type="text"]');
        if (input && promptStr && promptStr !== 'undefined') input.value = promptStr;
        
        // Find the main generate button for this tool
        const generateBtn = page.querySelector('.ask-box button, .form-card .primary-btn:not([style*="display: none"])');
        if (generateBtn) generateBtn.click();
    }
}


window.copyResult = function(btn) {
    const card = btn.closest('.ai-answer-area').querySelector('.dashboard-card');
    if (card) {
        navigator.clipboard.writeText(card.innerText);
        const original = btn.innerText;
        btn.innerText = 'Copied!';
        setTimeout(() => btn.innerText = original, 2000);
    }
}

window.clearCurrent = function(btn) {
    const answerArea = btn.closest('.ai-answer-area');
    if (answerArea) {
        answerArea.innerHTML = '';
        answerArea.style.display = 'none';
    }
}

window.newChat = function(btn) {
    window.clearCurrent(btn);
    // Find the nearest ask-box and clear input
    const page = btn.closest('.page');
    if (page) {
        const input = page.querySelector('input[type="text"]');
        if (input) {
            input.value = '';
            input.focus();
        }
        const fileInput = page.querySelector('input[type="file"]');
        if (fileInput) {
            // Trigger clear button for PDF/Image if exists
            const clearBtn = page.querySelector('#iq-clear-btn, #pdf-clear-btn');
            if (clearBtn) clearBtn.click();
        }
    }
}
