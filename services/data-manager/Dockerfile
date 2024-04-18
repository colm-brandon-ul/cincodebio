FROM python:3.9.17-slim
COPY requirements.txt .

RUN pip install -r requirements.txt

ADD ./app app

WORKDIR /app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]