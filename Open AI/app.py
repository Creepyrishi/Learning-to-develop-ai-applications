from openai import OpenAI
from dotenv import load_dotenv
import os
import flask
from flask import Flask, render_template, jsonify, request, session, stream_with_context
import json

# S E T U P
load_dotenv()
Client = OpenAI(base_url=os.getenv("BASE_URL_GROQ"), api_key=os.getenv("GROQ_API")) # I have used Groq
app = Flask(__name__)

app.secret_key = os.getenv("FLASK_SECRET_KEY")

SYSTEM_MESSAGE = {
        "role": "system",
        "content": "You are helpful assistant named Rohini.",
    }

def inferece(conversation, question):
    user_msg = {"role": "user", "content": question}
    conversation.append(user_msg)

    respose = Client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=conversation,
        # max_completion_tokens=50,
        temperature=0.95,
    )
    bot_response = respose.choices[0].message.content

    bot_msg = {"role": "assistant", "content": bot_response}
    conversation.append(bot_msg)

    return bot_response

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/answer", methods = ["POST"])
def answer():

    question = request.get_json()
    message = question.get("message")
    conversation = session.get('conversation', [SYSTEM_MESSAGE.copy()])
    user_msg = {"role": "user", "content": message}
    conversation.append(user_msg)
    session["conversation"] = conversation
    full_string = ''

    def generator():
        nonlocal full_string

        try:
            respose = Client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=conversation,
                temperature=0.95,
                stream=True
            )

            for chunk in respose:
                if chunk.choices[0].delta.content is not None:
                    full_string += chunk.choices[0].delta.content
                    yield(chunk.choices[0].delta.content)
                    # yield(json.dumps({"content": chunk.choices[0].delta.content}))
        finally:
            bot_msg = {"role": "assistant", "content": full_string}
            conversation.append(bot_msg)
            session["conversation"] = conversation

    # return generator(), {"Content-Type" : "application/json"}
    return stream_with_context(generator()), {"Content-Type" : "text/plain"}

@app.route('/reset', methods= ["POST"])
def reset():
    session.pop('conversation', None)
    return jsonify({"status": "cleared"})

if __name__ == "__main__":
    app.run(debug=True)
