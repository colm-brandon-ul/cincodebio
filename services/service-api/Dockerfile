ARG PYTHON_BASE_IMAGE=mirror.gcr.io/library/python:3.9.17-alpine3.18
FROM ${PYTHON_BASE_IMAGE}
COPY requirements.txt .

RUN pip install -r requirements.txt

ARG CINCODEBIO_SOURCE_HASH=unknown
LABEL cincodebio.source-hash=$CINCODEBIO_SOURCE_HASH
ADD ./app app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]