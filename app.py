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
    question = data.get("question", "")
    mode = data.get("mode", "normal")
    context = data.get("context", "")
    action = data.get("action", "")
    language = data.get("language", "")
    notes = data.get("notes", "")

    if mode == "notes":
        prompt = f"""
Create simple and easy-to-understand study notes about: {question}

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
"""
    elif mode == "planner":
        prompt = f"""
Create a clear, structured, and easy-to-follow study plan for a student about: {question}

Follow these guidelines:
- Break the study schedule down day-by-day (e.g. Day 1, Day 2, etc.) or into clear phases based on the student's timeframe.
- For each day, include: Focus Topic, Key Tasks (2-3 realistic goals), Practice or Review activity.
- Add quick study tips at the end.
- Use simple bullet points and encouraging language.
"""
    elif mode == "quick-help":
        prompt = f"""
Explain the following topic simply, as if to a confused student: {question}

Guidelines:
- Use simple language and short paragraphs.
- Explain difficult terms.
- Use a relatable analogy if it helps.
- Give a simple example.
- Avoid unnecessary technical language.
- Keep the explanation concise.
"""
    elif mode == "flashcards":
        prompt = f"""
Create exactly 8 flashcards about: {question}

You MUST return ONLY valid JSON in this exact structure, with no markdown formatting:
{{
  "cards": [
    {{
      "front": "Question or term here",
      "back": "Short answer or definition here"
    }}
  ]
}}
"""
    elif mode == "answer-practice-q":
        prompt = f"""
Generate ONE descriptive, thought-provoking question for a student to answer about: {question}.
Difficulty: {context if context else 'medium'}.
Do NOT provide the answer. Just ask the question.
"""
    elif mode == "answer-practice-eval":
        prompt = f"""
Evaluate the student's answer to this question:
Question: {context}
Student's Answer: {question}

You MUST return ONLY valid JSON in this exact structure:
{{
  "score": "X/10",
  "correct": "What they got right...",
  "missing": "What they missed...",
  "improved": "An example of a perfect short answer...",
  "explanation": "Brief encouraging feedback..."
}}
"""
    elif mode == "mock-test-gen":
        prompt = f"""
Generate a mock test about: {question}
Include exactly 5 MCQs and 2 short-answer questions.
You MUST return ONLY valid JSON in this exact structure:
{{
  "mcqs": [
    {{
      "question": "...",
      "options": [
        {{"letter": "A", "text": "..."}},
        {{"letter": "B", "text": "..."}},
        {{"letter": "C", "text": "..."}},
        {{"letter": "D", "text": "..."}}
      ],
      "correctAnswer": "A",
      "explanation": "..."
    }}
  ],
  "short_answers": [
    {{
      "question": "..."
    }}
  ]
}}
"""
    elif mode == "mock-test-eval":
        prompt = f"""
Evaluate the student's short answers for a mock test.
Data: {question}

You MUST return ONLY valid JSON in this exact structure:
{{
  "evaluations": [
    {{
      "score": "X/10",
      "feedback": "..."
    }}
  ]
}}
"""
    elif mode == "code-helper":
        prompt = f"""
Act as a helpful programming tutor.
Language: {language}
Action requested: {action}
Code/Question: {question}

Guidelines:
- Explain clearly and simply.
- Format code cleanly.
- If finding a bug, explain WHY it's a bug before giving the solution.
- Keep it encouraging.
"""
    elif mode == "maths-solver":
        prompt = f"""
Act as a helpful math tutor. Solve this problem: {question}

Guidelines:
- Provide the final answer clearly.
- Provide a step-by-step explanation.
- Mention any formulas used.
- Do not just give the answer without the steps.
- If the problem is unclear, state your assumptions.
"""
    elif mode == "ask-my-notes":
        prompt = f"""
You are a helpful study buddy. The student is asking a question based on their saved notes.
Notes:
{notes}

Student's Question: {question}

Guidelines:
- Answer the question based PRIMARILY on the provided notes.
- If the notes don't contain the answer, you can use your general knowledge but mention that it wasn't in the notes.
- Keep it clear and concise.
"""
    else:
        prompt = f"""
Answer the following question for a student: {question}

Guidelines:
- Use clear headings, short paragraphs, and bullet points where useful.
- Highlight important terms using bold.
- Provide examples when useful.
"""

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt
        )
        answer = response.text
        
        json_modes = ["mcq", "flashcards", "answer-practice-eval", "mock-test-gen", "mock-test-eval"]
        
        if mode in json_modes:
            import json
            clean_json = answer.strip()
            if clean_json.startswith("`json"):
                clean_json = clean_json[7:]
            elif clean_json.startswith("`"):
                clean_json = clean_json[3:]
            if clean_json.endswith("`"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()
            
            parsed_data = json.loads(clean_json)
            return jsonify({"answer": parsed_data, "isJson": True})
            
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/summarize-pdf", methods=["POST"])
def summarize_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file."}), 400
        
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Invalid file format. Please upload a PDF."}), 400

    file_bytes = file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        return jsonify({"error": "File is too large. Max size is 5MB."}), 400

    if len(file_bytes) == 0:
        return jsonify({"error": "The uploaded PDF is empty."}), 400

    try:
        import io
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        
        if len(reader.pages) > 20:
            return jsonify({"error": "PDF is too long. Max limit is 20 pages."}), 400

        extracted_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
        
        extracted_text = extracted_text.strip()
        
        if not extracted_text:
            return jsonify({"error": "No readable text found in PDF. Scanned images (OCR) are not currently supported."}), 400
            
        prompt = f"""
Turn the following extracted PDF content into useful study material.

Guidelines:
- Give a short overview.
- Identify the important concepts.
- Create clear headings and bullet points.
- Highlight important definitions, formulas, dates, or facts when present.
- Keep the explanation student-friendly.
- Do not invent information that is not present in the PDF.

Extracted PDF content:
{extracted_text}
"""
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt
        )
        return jsonify({"answer": response.text})

    except Exception as e:
        return jsonify({"error": "Failed to process PDF: " + str(e)}), 500


@app.route("/image-q", methods=["POST"])
def image_q():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded."}), 400
    
    file = request.files['file']
    action = request.form.get('action', 'explain')
    
    if file.filename == '':
        return jsonify({"error": "No selected file."}), 400
        
    file_bytes = file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        return jsonify({"error": "File is too large. Max size is 5MB."}), 400

    prompt = "Explain this image in detail for a student."
    if action == "quiz":
        prompt = "Create 3 practice questions based on this image. Provide the questions first, then the answers below."

    try:
        from google.genai import types
        part = types.Part.from_bytes(data=file_bytes, mime_type=file.mimetype)
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, part]
        )
        return jsonify({"answer": response.text})

    except Exception as e:
        return jsonify({"error": "Failed to process image: " + str(e)}), 500

if __name__ == "__main__":

    app.run(debug=True)