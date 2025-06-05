# app.py (Updated)
from flask import Flask, request, jsonify, render_template # Added render_template
import joblib
import pandas as pd
import numpy as np
import os

# --- Configuration ---
MODEL_DIR = 'model_artifacts'
# Make sure to load the SMOTE-trained model!
MODEL_PATH = os.path.join(MODEL_DIR, 'diabetes_rf_model_smote.joblib') # Changed to SMOTE model
SCALER_PATH = os.path.join(MODEL_DIR, 'diabetes_scaler.joblib')
FEATURE_COLUMNS_PATH = os.path.join(MODEL_DIR, 'feature_columns.joblib')

# --- Initialize Flask App ---
app = Flask(__name__,
            template_folder='templates', # Specify templates folder
            static_folder='static')      # Specify static folder

# --- Load the Model and Scaler ---
try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
    print("Model, Scaler, and Feature Columns loaded successfully for API.")
except FileNotFoundError:
    print(f"Error: Model artifacts not found in '{MODEL_DIR}'. Please ensure they are saved.")
    print("Run the model saving step (4.1.1 or 5.1 if using SMOTE) in your training script first.")
    exit()
except Exception as e:
    print(f"An unexpected error occurred while loading model artifacts: {e}")
    exit()

# --- Define API Endpoint for Prediction ---
@app.route('/predict_diabetes', methods=['POST'])
def predict_diabetes():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json(force=True)

    input_df = pd.DataFrame([data])

    input_processed_df = pd.DataFrame(0, index=[0], columns=feature_columns)
    for col in input_df.columns:
        if col in input_processed_df.columns:
            input_processed_df[col] = input_df[col]
    for col in input_processed_df.columns:
        if input_processed_df[col].dtype == 'bool':
            input_processed_df[col] = input_processed_df[col].astype(int)

    numerical_cols = ['age', 'bmi', 'HbA1c_level', 'blood_glucose_level']
    
    if not input_processed_df.empty:
        input_processed_df[numerical_cols] = scaler.transform(input_processed_df[numerical_cols])

    prediction = model.predict(input_processed_df)[0]
    prediction_proba = model.predict_proba(input_processed_df)[:, 1][0]

    prediction_label = "Diabetes" if prediction == 1 else "No Diabetes"

    return jsonify({
        "prediction": prediction_label,
        "probability_of_diabetes": round(float(prediction_proba), 4)
    })

# --- Define New Route for the Web Application (Homepage) ---
@app.route('/')
def home():
    """
    Serves the main HTML page for the diabetes prediction app.
    """
    return render_template('index.html') # This will look for index.html in the 'templates' folder

# --- Run the Flask App ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)