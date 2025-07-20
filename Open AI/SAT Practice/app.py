from openai import OpenAI
from dotenv import load_dotenv
import os
from flask import Flask, jsonify, session, request, stream_with_context, Response
from flask_cors import CORS


load_dotenv()
client = OpenAI(base_url=os.getenv("BASE_URL_GROQ"), api_key=os.getenv("GROQ_API"))

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
CORS(app)


@app.route("/explain", methods=["POST"])
def explain_ext():
    data = request.get_json()
    html = data.get("html")
    def generator():
        message = [
            {
                "role": "system",
                "content": "You are an SAT tutor helping a student who is not a native English speaker. You teach nothing except SAT.",
            },
            {
                "role": "user",
                "content": f"""
                Your job is to **intuitively explain** the question and answer choices using the information below. The correct answer and explanations for each choice are already given.

                Follow these instructions strictly:
                - Start explaining right away. Do **not** ask anything or confirm.
                - Use simple English and short sentences.
                - Explain using common life examples or comparisons a student can relate to.
                - Avoid complex words unless you define them.
                - If possible, **make the student feel like they're thinking through the problem with you**.
                - Do not repeat the question unless it’s helpful.
                - For each answer choice:
                    1. Rephrase it in simpler words.
                    2. Clearly say if it's correct or incorrect.
                    3. Give a gentle, logical explanation for why it makes sense or not.

                Keep your explanation concise:
                - Do not write more than 4-5 lines per answer choice.
                - Use bullet points or short paragraphs where helpful.
                - Do not repeat the question unless it helps clarify.
                - Avoid repeating similar points across answer choices.

                Here is the full question and feedback to work from:

                ---
                {html}
                ---
                """,
            },
        ]

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant", temperature=0.3, messages=message, stream=True
        )

        for chunk in response:
            if chunk.choices[0].delta.content is not None:
                yield (chunk.choices[0].delta.content)

    return Response(stream_with_context(generator()), mimetype="text/plain")


if __name__ == "__main__":
    app.run(debug=True)
