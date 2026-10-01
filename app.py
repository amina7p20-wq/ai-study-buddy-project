from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    try:
        with open(".env", "r") as f:
            content = f.read().strip()
            if "=" in content:
                api_key = content.split("=", 1)[1].strip()
            else:
                api_key = content
    except FileNotFoundError:
        pass

if not api_key:
    api_key = "MISSING_API_KEY"

client = genai.Client(api_key=api_key)

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
"""
    elif mode == "mcq":
        prompt = f"""
Create exactly 5 multiple-choice questions about: {question}

You MUST return ONLY valid JSON in this exact structure, with no markdown formatting around it:
{{
  "questions": [
    {{
      "question": "What is...?",
      "options": [
        {{"letter": "A", "text": "Option A"}},
        {{"letter": "B", "text": "Option B"}},
        {{"letter": "C", "text": "Option C"}},
        {{"letter": "D", "text": "Option D"}}
      ],
      "correctAnswer": "A",
      "explanation": "One short sentence explaining why."
    }}
  ]
}}
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
"""
    elif mode == "quick-help":
        prompt = f"""
Explain the following topic simply, as if to a confused student.

Topic: {question}

Guidelines:
- Use simple language and short paragraphs.
- Explain difficult terms.
- Use a relatable analogy if it helps.
- Give a simple example.
- Avoid unnecessary technical language.
- Keep the explanation concise and focused on understanding rather than memorization.
"""
    else:
        prompt = f"""
Answer the following question for a student:

{question}

Guidelines:
- Use clear headings, short paragraphs, and bullet points where useful.
- Highlight important terms using bold.
- Provide examples when useful.
- Adapt the structure naturally to the question (e.g., short answers for factual questions, structured answers for complex topics).
"""

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt
        )
        answer = response.text
        
        if mode == "mcq":
            import json
            clean_json = answer.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            elif clean_json.startswith("```"):
                clean_json = clean_json[3:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()
            
            parsed_data = json.loads(clean_json)
            return jsonify({"answer": parsed_data, "isJson": True})
            
        return jsonify({"answer": answer})
    except Exception as e:
        # Returning a proper JSON error prevents CORS Network Errors on the frontend
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)