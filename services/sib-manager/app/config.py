import jinja2

TEMPLATE_DIR = "./src/templates/"
STATIC_DIR = "./src/static/"
STATIC_CODE_DIR = "./src/static-code/"
PERSISTENT_STATE_MOUNT_PATH = "/sib-manager-state"

LATEST_SIBS = "latest_sibs.json"
OTHER_SIBS = "other_sibs.json"
INSTALLED_SIBS = "installed_sibs.json"

CURRENT_SIBS_IME_JSON = "current_ime_sibs.json"
UTD_SIB_FILE = "lib.sibs"
SIB_MAP_FILE = "sib_map.json"

# Common constants
DH_ENDPOINT = "hub.docker.com"
DH_AUTH_ENDPOINT = "auth.docker.io"
DH_API_ENDPOINT = "registry-1.docker.io"


JINJA_ENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR), 
    extensions=['jinja2_strcase.StrcaseExtension'])