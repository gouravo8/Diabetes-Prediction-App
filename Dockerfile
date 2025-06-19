# Use the official Python image as a base image.
# This version is recommended for Google Cloud Run and Render.
FROM python:3.9-slim-buster

# Set the working directory in the container.
WORKDIR /app

# Copy the requirements.txt file into the container at /app.
COPY requirements.txt .

# Install any needed packages specified in requirements.txt.
# Using --no-cache-dir to save space.
# Using --upgrade pip to ensure pip is up-to-date.
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code (app.py) and model artifacts into the container.
# This copies everything from your local /app folder.
# This assumes your model_artifacts folder is directly inside your main project folder.
COPY . /app

# Expose the port that the application will listen on.
# Render typically expects services to listen on port 8080 by default.
ENV PORT 8080

# Run the application using Gunicorn, a production-ready WSGI server.
# This command tells the container to start your Flask app (`app`).
# The --bind 0.0.0.0:$PORT tells Gunicorn to listen on the specified port.
# The --timeout 0 disables the default 30-second request timeout (useful for longer predictions).
CMD exec gunicorn --bind 0.0.0.0:$PORT --timeout 0 app:app
