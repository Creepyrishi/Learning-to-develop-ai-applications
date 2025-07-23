from openai import OpenAI
from flask import Flask, jsonify, session, request, stream_with_context, Response
from flask_sqlalchemy import SQLAlchemy
from flask_session import Session
from flask_cors import CORS
from utils import *
from ai import *

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

app.config["SQLALCHEMY_DATABASE_URI"] = 'sqlite:///user_convo.sqlite3'
app.config["SESSION_TYPE"] = 'sqlalchemy'

db = SQLAlchemy(app)
app.config['SESSION_SQLALCHEMY'] = db
sess = Session(app)
CORS(app)

# with app.app_context():
#     db.create_all()

@app.route("/explain", methods=["POST"])
def explain_ext():

    data = request.get_json()
    api  = data.get("api")
    model = data.get("model")
    question_id = data.get("question_id")
    html = data.get("html")
    subject = data.get("subject")

    if not api:
        return jsonify({'status' : 'Add API'}), 401
    
    if subject.lower() == 'math':
        html = preprocess(html)
    else:
        html = reomve_html_attribute(html) 
    
    if 'convo' not in session:
        session['convo'] = {}

    conversation = session['convo']
    
    if question_id not in conversation:
        conversation[question_id] = get_explanation_prompt(html)

    return Response(stream_with_context(get_explanation_stream(api=api, model=model, html=html)), mimetype="text/plain")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message")
    question_id = data.get("question_id")
    api = data.get("api")
    model = data.get("model")

    if 'convo' not in session:
        session['convo'] = {}
    
    conversation = session['convo']
    
    if question_id not in conversation:
        conversation[question_id] = [{"role": "system", "content": "You are a helpful assistant."}]
    
    conversation[question_id].append({"role": "user", "content": message} )
    messages = conversation[question_id]
    def generator():
        for chunk in chat_with_steam(api, messages, model):
            yield chunk

    return stream_with_context(generator()), {"Content-Type" : "text/plain"}

@app.route('/save_response', methods=["POST"])
def save_response():
    data = request.get_json()
    question_id = data.get('question_id')
    response = data.get('response')
    session['convo'][question_id].append({"role": "assistant", "content": response})
    session.modified = True 

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
