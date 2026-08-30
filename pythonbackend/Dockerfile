FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /app/pythonbackend/requirements.txt
RUN pip install --no-cache-dir -r /app/pythonbackend/requirements.txt

COPY . /app/pythonbackend

EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
