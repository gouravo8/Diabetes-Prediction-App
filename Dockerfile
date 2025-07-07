# Use the official Python image as a base image.
FROM python:3.9-slim-buster

# Set the working directory in the container.
WORKDIR /app

# Copy the requirements.txt file first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies, forcing reinstallation of key libraries
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application code into the container.
COPY . /app

# Expose the port that the application will listen on.
ENV PORT 10000

# Run the application using Gunicorn.
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "--timeout", "0", "app:app"]
