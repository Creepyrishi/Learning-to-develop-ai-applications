from openai import OpenAI
from flask import Flask, jsonify, session, request, stream_with_context, Response
from flask_cors import CORS
from utils import *
from ai import *
from db import *

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
CORS(app)

from db import get_chat, create_document, update_chat, user_collection

@app.route("/explain", methods=["POST"])
def explain_ext():
    data = request.get_json()
    api  = data.get("api")
    model = data.get("model")
    question_id = data.get("question_id")
    html = data.get("html")
    subject = data.get("subject")

    if not api:
        return jsonify({'status': 'Add API'}), 401

    # Clean the HTML
    if subject.lower() == 'math':
        html = preprocess(html)
    else:
        html = reomve_html_attribute(html)

    # If user doesn't exist, create document
    if not user_collection.find_one({'_id': api}):
        create_document(api)

    # If question doesn't exist, create question
    if not  user_collection.find_one({'_id': api, 'conversation._id': question_id}):
        create_new_question(api, question_id)
    
    update_chat(api, question_id, get_explanation_prompt(html))

    return Response(
        stream_with_context(get_explanation_stream(api=api, model=model, html=html)),
        mimetype="text/plain"
    )


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message")
    question_id = data.get("question_id")
    api = data.get("api")
    model = data.get("model")

    chat = get_chat(api, question_id)
    chat.append({'role': 'user', 'content': message})
    update_chat(api, question_id, chat)    

    def generator():
        for chunk in chat_with_steam(api, chat, model):
            yield chunk

    return stream_with_context(generator()), {"Content-Type" : "text/plain"}

@app.route('/save_response', methods=["POST"])
def save_response():
    data = request.get_json()
    question_id = data.get('question_id')
    api = data.get('api')
    response = data.get('response')

    chat = get_chat(api, question_id)
    chat.append({'role': 'assistant', 'content': response})

    update_chat(api, question_id, chat)
    return jsonify({'status' : 'sucess'}), 200


@app.route("/pop")
def pop():
    session.clear()
    return '200'
@app.route("/get" , methods=['GET'])
def get():
    return jsonify(dict(session))

if __name__ == "__main__":
    app.run(debug=True)
