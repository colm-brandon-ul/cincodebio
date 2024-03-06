FROM python:3.9.17-alpine3.18
COPY requirements.txt .

RUN pip install -r requirements.txt
ADD ./app app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]