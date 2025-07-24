from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()
client = MongoClient(os.getenv("MONGO_CONNECTION"))

db = client.data
user_collection = db.Users

def create_document(_id):
    data = {
    '_id': _id, 
    "conversation": []
    }
    user_collection.insert_one(data)
    return True

def create_new_question(_id, question_id):
    user_collection.update_one(
    {'_id': _id},
    {'$push': {
        'conversation': {
            '_id': question_id,
            'chat': []
        }
    }}
)

def get_chat(_id, question_id):
    document = user_collection.find_one({'_id' : _id})
    for question in document["conversation"]:
        if question["_id"] == question_id:
            return question["chat"]

def update_chat(_id, question_id, new_chat):

    document = user_collection.find_one({'_id': _id, 'conversation._id': question_id})
    
    if not document:
        return False

    result = user_collection.update_one(
        {'_id': _id, 'conversation._id': question_id},
        {'$set': {'conversation.$.chat': new_chat}}
    )

    return result.modified_count > 0
