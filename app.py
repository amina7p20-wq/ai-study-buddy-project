
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

client = OpenAI()


@app.route("/ask", methods=["POST"])
def ask():

    data = request.json

    question = data["question"]
    mode = data.get("mode", "normal")


    if mode == "notes":

        prompt = f"""
Create simple and easy-to-understand study notes about:

{question}

Use:
- Clear headings
- Short bullet points
- Important definitions
- Key points
- Simple language

Do not use ### symbols.
"""


    elif mode == "mcq":

        prompt = f"""
Create exactly 5 multiple-choice questions about:

{question}

For each question use this exact format:

Question: [question]

A) [option]
B) [option]
C) [option]
D) [option]

Correct Answer: [letter]
Explanation: [one short sentence]

Do not use ### or other Markdown headings.
Keep the questions suitable for a student.
"""


    elif mode == "planner":

        prompt = f"""
Create a clear, structured, and easy-to-follow study plan for a student about:

{question}

Follow these guidelines:
- Break the study schedule down day-by-day (e.g. Day 1, Day 2, etc.) or into clear phases based on the student's timeframe.
- For each day, include:
  * Focus Topic
  * Key Tasks (2-3 realistic goals)
  * Practice or Review activity
- Add quick study tips at the end.
- Use simple bullet points and encouraging language.
- Do not use ### symbols or markdown headings.
"""


    else:

        prompt = question


    response = client.responses.create(
        model="gpt-5.6-luna",
        input=prompt
    )

    answer = response.output_text

    return jsonify({
        "answer": answer
    })


if __name__ == "__main__":
    app.run(debug=True)