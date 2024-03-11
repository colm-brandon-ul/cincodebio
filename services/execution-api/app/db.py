import pymongo
import os 

# MY_SERVICE_SERVICE_HOST
# MY_SERVICE_SERVICE_PORT

MONGODB_HOST = os.environ.get("MONGODB_SERVICE_HOST")
MONGODB_PORT = os.environ.get("MONGODB_SERVICE_PORT")
WORKFLOW_DB = os.environ.get("WORKFLOW_DB")
WORKFLOW_COLLECTION = os.environ.get("WORKFLOW_COLLECTION")

# mdbclient = pymongo.MongoClient(MONGODB_HOST, int(MONGODB_PORT),minPoolSize=0, maxPoolSize=200)

def get_db_client():
    # db = mdbclient[WORKFLOW_DB]
    # db_col = db[WORKFLOW_COLLECTION]
    # return db_col
    return None

