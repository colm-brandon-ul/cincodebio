import jinja2
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_ONTOLOGY_URL = os.getenv('DEFAULT_ONTOLOGY_URL')


TEMPLATE_DIR = "./src/templates/"
STATIC_DIR = "./src/static/"
STATIC_CODE_DIR = "./src/static-code/"
PERSISTENT_STATE_MOUNT_PATH = Path("./ontology-manager-state")
ONTOLOGY_STATE_FILE = "ontology-state.pkl"

JINJA_ENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR))

