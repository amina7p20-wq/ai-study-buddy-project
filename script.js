
const button = document.querySelector("button");
const input = document.querySelector("input");
const answer = document.querySelector("#answer");


// =========================
// ASK AI BUTTON
// =========================

button.addEventListener("click", async function () {

    const question = input.value.trim();

    if (question === "") {
        answer.textContent = "Please type a question first.";
        return;
    }

    answer.textContent = "Thinking...";


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


        const data = await response.json();


        if (input.dataset.mode === "mcq") {

            displayMCQs(data.answer);

        } else {

            displayNormalAnswer(data.answer);

        }


    } catch (error) {

        answer.textContent =
            "Something went wrong. Make sure the Python server is running.";

        console.error(error);

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

    answer.innerHTML = "";

    const lines = text.split("\n");


    lines.forEach(function (line) {

        if (line.trim() === "") {
            return;
        }


        const paragraph = document.createElement("p");

        paragraph.textContent =
            line.replace(/\*\*/g, "");


        answer.appendChild(paragraph);

    });

}


// =========================
// MCQ QUIZ
// =========================

function displayMCQs(text) {

    answer.innerHTML = "";


    const questions =
        text.split(/(?=Question:)/g);


    questions.forEach(function (questionText) {

        if (!questionText.trim()) {
            return;
        }


        // Get question

        const questionMatch =
            questionText.match(/Question:\s*(.*)/);


        // Get options

        const optionAMatch =
            questionText.match(/A\)\s*(.*)/);

        const optionBMatch =
            questionText.match(/B\)\s*(.*)/);

        const optionCMatch =
            questionText.match(/C\)\s*(.*)/);

        const optionDMatch =
            questionText.match(/D\)\s*(.*)/);


        // Get correct answer

        const correctMatch =
            questionText.match(
                /Correct Answer:\s*([A-D])/i
            );


        // Get explanation

        const explanationMatch =
            questionText.match(
                /Explanation:\s*(.*)/
            );


        // Check required information

        if (
            !questionMatch ||
            !optionAMatch ||
            !optionBMatch ||
            !optionCMatch ||
            !optionDMatch ||
            !correctMatch
        ) {
            return;
        }


        // Create quiz card

        const card =
            document.createElement("div");

        card.className = "quiz-card";


        // Question

        const question =
            document.createElement("h3");

        question.textContent =
            questionMatch[1];

        card.appendChild(question);


        // Options

        const options = [

            ["A", optionAMatch[1]],

            ["B", optionBMatch[1]],

            ["C", optionCMatch[1]],

            ["D", optionDMatch[1]]

        ];


        const correctAnswer =
            correctMatch[1].toUpperCase();


        // Result message

        const result =
            document.createElement("p");

        result.className = "quiz-result";


        // Explanation

        const explanation =
            document.createElement("p");

        explanation.className =
            "quiz-explanation";


        // Hide explanation initially

        explanation.style.display = "none";


        if (explanationMatch) {

            explanation.textContent =
                "Explanation: " +
                explanationMatch[1];

        }


        // Create option buttons

        options.forEach(function (option) {

            const optionButton =
                document.createElement("button");


            optionButton.className =
                "quiz-option";


            optionButton.textContent =
                option[0] + ") " + option[1];


            optionButton.addEventListener(
                "click",
                function () {


                    // Correct answer

                    if (option[0] === correctAnswer) {

                        optionButton.classList.add(
                            "correct"
                        );


                        result.textContent =
                            "✅ Correct!";


                        // Show explanation

                        explanation.style.display =
                            "block";

                    }


                    // Wrong answer

                    else {

                        optionButton.classList.add(
                            "wrong"
                        );


                        result.textContent =
                            "❌ Not quite. Try again!";

                    }

                }
            );


            card.appendChild(optionButton);

        });


        // Add result

        card.appendChild(result);


        // Add explanation

        card.appendChild(explanation);


        // Add card to page

        answer.appendChild(card);

    });

}


// =========================
// STUDY NOTES
// =========================

function studyNotes() {

    input.value = "";

    input.placeholder =
        "Enter a topic for study notes...";

    input.focus();

    input.dataset.mode = "notes";

}


// =========================
// MCQ BUTTON
// =========================

function mcqQuiz() {

    input.value = "";

    input.placeholder =
        "Enter a topic for MCQs...";

    input.focus();

    input.dataset.mode = "mcq";

}


// =========================
// STUDY PLANNER
// =========================

function studyPlanner() {

    input.value = "";

    input.placeholder =
        "Enter topic & timeframe (e.g., Biology exam in 5 days)...";

    input.focus();

    input.dataset.mode = "planner";

}


// =========================
// OTHER FEATURES
// =========================

function showMessage(feature) {

    alert(
        "You selected: " + feature
    );

}