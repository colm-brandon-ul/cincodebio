import pymongo

from config import MONGODB_HOST, MONGODB_PORT, WORKFLOW_DB, WORKFLOW_COLLECTION

# MY_SERVICE_SERVICE_HOST
# MY_SERVICE_SERVICE_PORT


mdbclient = pymongo.MongoClient(MONGODB_HOST, int(MONGODB_PORT),minPoolSize=0, maxPoolSize=200)

def get_db_client():
    db = mdbclient[WORKFLOW_DB]
    db_col = db[WORKFLOW_COLLECTION]
    return db_col

