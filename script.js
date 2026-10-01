
const button = document.querySelector(".ask-box button");
const input = document.querySelector(".ask-box input");
const answer = document.querySelector("#answer");
const modeIndicatorContainer = document.getElementById("mode-indicator-container");
const modeBadge = document.getElementById("mode-badge");


// =========================
// ASK AI BUTTON
// =========================

button.addEventListener("click", async function () {
    const question = input.value.trim();

    if (question === "") {
        answer.innerHTML = "<p>Please type a question first.</p>";
        return;
    }

    // Set loading state
    button.disabled = true;
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";
    answer.innerHTML = '<div class="loading-indicator">StudyFlow is thinking...</div>';

    try {
        const response = await fetch("http://127.0.0.1:5000/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: question,
                mode: input.dataset.mode || "normal"
            })
        });

        if (!response.ok) {
            if (input.dataset.mode === "mcq") {
                answer.innerHTML = "<p>Couldn’t generate the quiz. Please try again.</p>";
            } else {
                answer.innerHTML = "<p>Something went wrong. Please try again.</p>";
            }
            console.error("Backend failed:", response.statusText);
        } else {
            const data = await response.json();
            if (input.dataset.mode === "mcq" && data.isJson && data.answer.questions) {
                startMCQQuiz(data.answer.questions, question);
            } else if (input.dataset.mode === "mcq") {
                answer.innerHTML = "<p>Couldn’t generate the quiz. Please try again.</p>";
            } else {
                displayNormalAnswer(data.answer);
            }
        }
    } catch (error) {
        if (input.dataset.mode === "mcq") {
            answer.innerHTML = "<p>Couldn’t generate the quiz. Please try again.</p>";
        } else {
            answer.innerHTML = "<p>Something went wrong. Please try again.</p>";
        }
        console.error(error);
    } finally {
        // Restore button
        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";
    }
});


// =========================
// PRESS ENTER TO ASK AI
// =========================

input.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {

        event.preventDefault();

        button.click();

    }

});


// =========================
// NORMAL AI ANSWER
// =========================

function displayNormalAnswer(text) {
    const htmlContent = marked.parse(text);
    
    answer.innerHTML = `
        <button id="copy-btn" class="copy-btn" onclick="copyAnswer()">Copy</button>
        <div class="markdown-body" id="markdown-content">${htmlContent}</div>
    `;
}

function copyAnswer() {
    const textToCopy = document.getElementById('markdown-content').innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const copyBtn = document.getElementById('copy-btn');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}


// =========================
// MCQ QUIZ (INTERACTIVE)
// =========================

let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let currentQuizScore = 0;
let currentQuizTopic = "";

function startMCQQuiz(questions, topic) {
    currentQuizQuestions = questions;
    currentQuestionIndex = 0;
    currentQuizScore = 0;
    currentQuizTopic = topic;
    renderMCQQuestion();
}

function renderMCQQuestion() {
    answer.innerHTML = "";
    
    if (currentQuestionIndex >= currentQuizQuestions.length) {
        renderMCQResults();
        return;
    }
    
    const qData = currentQuizQuestions[currentQuestionIndex];
    
    const card = document.createElement("div");
    card.className = "quiz-card";
    
    const progress = document.createElement("div");
    progress.className = "quiz-progress";
    progress.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuizQuestions.length}`;
    
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
                currentQuizScore++;
            } else {
                btn.classList.add("wrong");
                Array.from(optionsContainer.children).forEach(childBtn => {
                    if (childBtn.textContent.startsWith(qData.correctAnswer + ")")) {
                        childBtn.classList.add("correct");
                    }
                });
            }
            
            const exp = document.createElement("div");
            exp.className = "quiz-explanation";
            exp.innerHTML = `<strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</strong> ${qData.explanation}`;
            card.appendChild(exp);
            
            const nextBtn = document.createElement("button");
            nextBtn.className = "quiz-next-btn";
            nextBtn.textContent = (currentQuestionIndex === currentQuizQuestions.length - 1) ? "View Results →" : "Next Question →";
            nextBtn.addEventListener("click", () => {
                currentQuestionIndex++;
                renderMCQQuestion();
            });
            card.appendChild(nextBtn);
        });
        
        optionsContainer.appendChild(btn);
    });
    
    card.appendChild(optionsContainer);
    answer.appendChild(card);
}

function renderMCQResults() {
    const incorrect = currentQuizQuestions.length - currentQuizScore;
    answer.innerHTML = `
        <div class="quiz-card" style="text-align: center; padding: 32px 20px;">
            <h3 style="font-size: 14px; margin-bottom: 8px; color: var(--text-sec); text-transform: uppercase; letter-spacing: 1px;">Your Score</h3>
            <div style="font-size: 36px; font-weight: 800; color: var(--primary); margin-bottom: 24px;">${currentQuizScore} / ${currentQuizQuestions.length}</div>
            
            <div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 32px; font-size: 13px;">
                <div><strong style="color: var(--success);">${currentQuizScore}</strong> Correct</div>
                <div><strong style="color: var(--error);">${incorrect}</strong> Incorrect</div>
            </div>
            
            <div style="display: flex; justify-content: center; gap: 12px;">
                <button class="quiz-next-btn" onclick="retryQuiz()">Try Again</button>
                <button class="quiz-next-btn" style="background: transparent; color: var(--primary); border: 1px solid var(--border-color);" onclick="resetMode()">Exit Quiz</button>
            </div>
        </div>
    `;
}

function retryQuiz() {
    input.value = currentQuizTopic;
    button.click();
}


// =========================
// MODE MANAGEMENT
// =========================

function setMode(mode, badgeText, placeholderText) {
    input.dataset.mode = mode;
    input.value = "";
    input.placeholder = placeholderText;

    modeBadge.textContent = "Mode: " + badgeText;
    modeIndicatorContainer.style.display = "flex";

    // Highlight the correct card
    document.querySelectorAll(".card").forEach(function (card) {
        card.classList.remove("active");
        if (card.querySelector("h3").textContent === badgeText) {
            card.classList.add("active");
        }
    });

    input.focus();
}

function resetMode() {
    input.dataset.mode = "normal";
    input.value = "";
    input.placeholder = "Ask me anything about your studies...";

    modeIndicatorContainer.style.display = "none";

    document.querySelectorAll(".card").forEach(function (card) {
        card.classList.remove("active");
    });

    input.focus();
}


// =========================
// MODES
// =========================

function studyNotes() {
    setMode("notes", "Study Notes", "Enter a topic for study notes...");
}

function mcqQuiz() {
    setMode("mcq", "MCQs & Quizzes", "Enter a topic for MCQs...");
}

function studyPlanner() {
    setMode("planner", "Study Planner", "Enter topic & timeframe (e.g., Biology exam in 5 days)...");
}


// =========================
// OTHER FEATURES
// =========================

function quickHelp() {
    setMode("quick-help", "Quick Help", "What do you need a simple explanation for?");
}

function showMessage(feature) {

    alert(
        "You selected: " + feature
    );

}