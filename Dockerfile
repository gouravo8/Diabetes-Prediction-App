# Use the official Python image as a base image, explicitly setting to 3.11.11
FROM python:3.11.11-slim-buster

# Set the working directory in the container.
WORKDIR /app

# Copy the requirements.txt file first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application code into the container.
# This should copy app.py, templates/, static/, and model_artifacts/
COPY . /app

# *** CRITICAL DEBUGGING STEP: List contents of /app to verify files are copied ***
# This output will appear in your Render build logs.
RUN ls -R /app

# Expose the port that the application will listen on.
# Set PORT environment variable to 10000, as Render logs indicated service running on this port.
ENV PORT 10000

# Run the application using Gunicorn.
# Bind to 0.0.0.0 and use the PORT environment variable.
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "--timeout", "0", "app:app"]
