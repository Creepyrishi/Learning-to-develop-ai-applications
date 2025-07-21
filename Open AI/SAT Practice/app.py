from openai import OpenAI
from flask import Flask, jsonify, session, request, stream_with_context, Response
from flask_cors import CORS
from utils import *
from ai import *

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
CORS(app)

@app.route("/explain", methods=["POST"])
def explain_ext():

    data = request.get_json()
    api  = data.get("api")
    model = data.get("model")
    html = data.get("html")
    subject = data.get("subject")

    if not api:
        return jsonify({'status' : 'Add API'}), 401
    
    if subject.lower() == 'math':
        html = preprocess(html)

    return Response(stream_with_context(get_explanation_stream(api=api, model=model, html=html)), mimetype="text/plain")

if __name__ == "__main__":
    app.run(debug=True)
