FROM ghcr.io/astral-sh/uv:python3.13-bookworm
RUN uv pip install --system upskill
WORKDIR /app
COPY server.py /app/server.py
EXPOSE 8090
CMD ["python", "/app/server.py"]
