{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": 7,
   "id": "ffd68137-7b45-4718-b6f6-1257e4aeedf7",
   "metadata": {},
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "Jupyter Notebook's current working directory: C:\\Users\\Gourav Rajput\\Diabetes_Prediction_Project\n",
      "Attempting to load heart disease dataset from: C:\\Users\\Gourav Rajput\\Diabetes_Prediction_Project\\cleveland.csv\n",
      "Dataset loaded successfully from 'cleveland.csv'.\n",
      "\n",
      "Starting data preprocessing...\n",
      "Dataframe has 298 rows after cleaning.\n",
      "Feature columns saved to model_artifacts\\heart_disease_feature_columns.joblib\n",
      "Scaler saved to model_artifacts\\heart_disease_scaler.joblib\n",
      "\n",
      "Training RandomForestClassifier model...\n",
      "Model training complete.\n",
      "Model Accuracy on Test Set: 0.88\n",
      "Heart disease model saved to model_artifacts\\heart_disease_model.joblib\n",
      "\n",
      "Heart disease model training and saving process complete!\n",
      "You can now find the model artifacts in the 'model_artifacts' folder.\n",
      "Next, we will update app.py and script.js to use this new model.\n"
     ]
    }
   ],
   "source": [
    "import pandas as pd\n",
    "import numpy as np\n",
    "from sklearn.model_selection import train_test_split\n",
    "from sklearn.preprocessing import StandardScaler\n",
    "from sklearn.ensemble import RandomForestClassifier\n",
    "from sklearn.metrics import accuracy_score\n",
    "import joblib\n",
    "import os\n",
    "import sys # Import sys to potentially exit gracefully if needed later\n",
    "\n",
    "# --- Configuration ---\n",
    "# Path where the model artifacts will be saved\n",
    "MODEL_ARTIFACTS_DIR = 'model_artifacts'\n",import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import os

# --- Configuration ---
# Path where the model artifacts will be saved
MODEL_ARTIFACTS_DIR = 'model_artifacts'
HEART_MODEL_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_model.joblib')
HEART_SCALER_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_scaler.joblib')
HEART_FEATURE_COLUMNS_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_feature_columns.joblib')

# Ensure the model_artifacts directory exists
os.makedirs(MODEL_ARTIFACTS_DIR, exist_ok=True)

# --- 1. Load Dataset ---
# Using a common Kaggle dataset (Cleveland Heart Disease Data)
# You might need to download this manually if direct URL fetch fails,
# or adjust the path if you place it in your project folder.
# For simplicity, we'll try to fetch it.
# A more robust way might be to prompt the user to download it.
print("Attempting to load heart disease dataset...")
try:
    # This dataset is commonly found as 'heart.csv' or similar.
    # It's often distributed in Kaggle datasets.
    # For a direct download example, you might need to find a raw CSV link.
    # Let's assume you have a 'heart.csv' file in your project directory
    # or can get one easily. If not, this step needs adjustment.
    # For now, let's use a public raw CSV link that is sometimes available.
    # If this specific URL fails, you'd need to download 'cleveland.csv' and place it.
    df = pd.read_csv('https://raw.githubusercontent.com/datasets/heart-disease/main/data/cleveland.csv')
    print("Dataset loaded successfully.")
except Exception as e:
    print(f"Error loading dataset from URL. Please download 'cleveland.csv' (or 'heart.csv') "
          f"and place it in your project directory, then update the path in the script. Error: {e}")
    # Fallback if download fails:
    try:
        df = pd.read_csv('cleveland.csv') # Assumes user downloaded it
        print("Dataset loaded from local 'cleveland.csv'.")
    except FileNotFoundError:
        print("Error: 'cleveland.csv' not found locally either. Please ensure the dataset file is present.")
        exit() # Exit if dataset isn't found


# --- 2. Preprocessing ---
# Based on typical Cleveland heart disease dataset columns
# Column names often mean:
# age: age
# sex: sex (1 = male; 0 = female)
# cp: chest pain type (0, 1, 2, 3)
# trestbps: resting blood pressure
# chol: serum cholestoral in mg/dl
# fbs: fasting blood sugar > 120 mg/dl (1 = true; 0 = false)
# restecg: resting electrocardiographic results (0, 1, 2)
# thalach: maximum heart rate achieved
# exang: exercise induced angina (1 = yes; 0 = no)
# oldpeak: ST depression induced by exercise relative to rest
# slope: the slope of the peak exercise ST segment
# ca: number of major vessels (0-3) colored by flourosopy
# thal: thal (3 = normal; 6 = fixed defect; 7 = reversible defect)
# target: diagnosis of heart disease (0 = no, 1 = yes)

# Rename target column to a standard 'target' if it's named 'num' or similar
if 'num' in df.columns:
    df.rename(columns={'num': 'target'}, inplace=True)

# Replace '?' with NaN for missing values
df = df.replace('?', np.nan)

# Convert all columns to numeric where possible, coercing errors to NaN
for col in df.columns:
    df[col] = pd.to_numeric(df[col], errors='coerce')

# Drop rows with any missing values
df.dropna(inplace=True)

# Define features (X) and target (y)
X = df.drop('target', axis=1)
y = df['target']

# Ensure target is binary (0 or 1 for presence of heart disease)
# Some datasets use 0=no, 1,2,3,4=yes. We convert 1,2,3,4 to 1.
y = y.apply(lambda x: 1 if x > 0 else 0)


# One-hot encode categorical features (cp, restecg, slope, ca, thal)
# These are typically treated as categorical
categorical_cols = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal']
# Filter out columns that don't exist in X to prevent errors if dataset varies
categorical_cols = [col for col in categorical_cols if col in X.columns]

X_encoded = pd.get_dummies(X, columns=categorical_cols, drop_first=False) # drop_first=False to keep all categories for consistent features

# Identify numerical features for scaling
numerical_cols = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']
numerical_cols = [col for col in numerical_cols if col in X_encoded.columns] # Ensure they exist

# Save the list of feature columns AFTER encoding and before splitting
heart_disease_feature_columns = X_encoded.columns.tolist()
joblib.dump(heart_disease_feature_columns, HEART_FEATURE_COLUMNS_PATH)
print(f"Feature columns saved to {HEART_FEATURE_COLUMNS_PATH}")

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X_encoded, y, test_size=0.2, random_state=42, stratify=y)

# Scale numerical features
scaler = StandardScaler()
X_train[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])
X_test[numerical_cols] = scaler.transform(X_test[numerical_cols])
joblib.dump(scaler, HEART_SCALER_PATH)
print(f"Scaler saved to {HEART_SCALER_PATH}")

# --- 3. Train Model ---
print("Training RandomForestClassifier model...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
print("Model training complete.")

# --- 4. Evaluate Model (Optional) ---
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy on Test Set: {accuracy:.2f}")

# --- 5. Save Model ---
joblib.dump(model, HEART_MODEL_PATH)
print(f"Heart disease model saved to {HEART_MODEL_PATH}")

print("\nHeart disease model training and saving process complete!")
print("You can now find the model artifacts in the 'model_artifacts' folder.")
print("Next, we will update app.py and script.js to use this new model.")

    "HEART_MODEL_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_model.joblib')\n",
    "HEART_SCALER_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_scaler.joblib')\n",
    "HEART_FEATURE_COLUMNS_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_feature_columns.joblib')\n",
    "\n",
    "# Ensure the model_artifacts directory exists\n",
    "os.makedirs(MODEL_ARTIFACTS_DIR, exist_ok=True)\n",
    "\n",
    "# --- 1. Load Dataset ---\n",
    "project_root = os.getcwd() # Get the current working directory of the Jupyter Notebook\n",
    "cleveland_csv_path = os.path.join(project_root, 'cleveland.csv')\n",
    "\n",
    "print(f\"Jupyter Notebook's current working directory: {project_root}\")\n",
    "print(f\"Attempting to load heart disease dataset from: {cleveland_csv_path}\")\n",
    "\n",
    "df = None # Initialize df to None\n",
    "\n",
    "try:\n",
    "    column_names = [\n",
    "        'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang',\n",
    "        'oldpeak', 'slope', 'ca', 'thal', 'target'\n",
    "    ]\n",
    "    df = pd.read_csv(cleveland_csv_path, header=None, names=column_names)\n",
    "    print(\"Dataset loaded successfully from 'cleveland.csv'.\")\n",
    "except FileNotFoundError:\n",
    "    current_dir = os.getcwd()\n",
    "    attempted_path = os.path.join(current_dir, 'cleveland.csv')\n",
    "    print(f\"ERROR: 'cleveland.csv' not found at the expected path: {cleveland_csv_path}\")\n",
    "    print(\"Please ensure you have downloaded the 'processed.cleveland.data' file from \")\n",
    "    print(\"https://archive.ics.uci.edu/dataset/45/heart+disease \")\n",
    "    print(\"and saved it as 'cleveland.csv' directly in your project directory (where your app.py is).\")\n",
    "except Exception as e:\n",
    "    print(f\"An unexpected error occurred while loading the dataset: {e}\")\n",
    "\n",
    "\n",
    "# --- 2. Preprocessing ---\n",
    "if df is not None:\n",
    "    print(\"\\nStarting data preprocessing...\")\n",
    "    # Replace '?' with NaN for missing values\n",
    "    df = df.replace('?', np.nan)\n",
    "\n",
    "    # Convert all columns to numeric where possible, coercing errors to NaN\n",
    "    # This loop ensures all columns that should be numeric are converted.\n",
    "    for col in df.columns:\n",
    "        df[col] = pd.to_numeric(df[col], errors='coerce')\n",
    "\n",
    "    # Drop rows with any missing values (NaNs introduced by 'coerce' or original '?')\n",
    "    df.dropna(inplace=True)\n",
    "\n",
    "    # After dropping rows, check if the DataFrame is still empty\n",
    "    if df.empty:\n",
    "        print(\"ERROR: DataFrame is empty after dropping rows with missing values. Check data quality.\")\n",
    "        # We can stop here gracefully if df is empty to prevent further errors\n",
    "        df = None # Set df to None so subsequent steps are skipped\n",
    "    else:\n",
    "        print(f\"Dataframe has {len(df)} rows after cleaning.\")\n",
    "\n",
    "    if df is not None: # Re-check if df is not None after the empty check\n",
    "        # Define features (X) and target (y)\n",
    "        X = df.drop('target', axis=1)\n",
    "        y = df['target']\n",
    "\n",
    "        # Ensure target is binary (0 or 1 for presence of heart disease)\n",
    "        # Some datasets use 0=no, 1,2,3,4=yes. We convert 1,2,3,4 to 1.\n",
    "        y = y.apply(lambda x: 1 if x > 0 else 0)\n",
    "\n",
    "\n",
    "        # One-hot encode categorical features (cp, restecg, slope, ca, thal)\n",
    "        # These are typically treated as categorical. 'sex' and 'fbs' are binary but good to include in get_dummies.\n",
    "        categorical_cols = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal']\n",
    "        # Filter out columns that don't exist in X to prevent errors if dataset varies\n",
    "        categorical_cols = [col for col in categorical_cols if col in X.columns]\n",
    "\n",
    "        X_encoded = pd.get_dummies(X, columns=categorical_cols, drop_first=False) # drop_first=False to keep all categories for consistent features\n",
    "\n",
    "        # Identify numerical features for scaling\n",
    "        numerical_cols = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']\n",
    "        numerical_cols = [col for col in numerical_cols if col in X_encoded.columns] # Ensure they exist\n",
    "\n",
    "        # Save the list of feature columns AFTER encoding and before splitting\n",
    "        heart_disease_feature_columns = X_encoded.columns.tolist()\n",
    "        joblib.dump(heart_disease_feature_columns, HEART_FEATURE_COLUMNS_PATH)\n",
    "        print(f\"Feature columns saved to {HEART_FEATURE_COLUMNS_PATH}\")\n",
    "\n",
    "        # Split data into training and testing sets\n",
    "        X_train, X_test, y_train, y_test = train_test_split(X_encoded, y, test_size=0.2, random_state=42, stratify=y)\n",
    "\n",
    "        # Scale numerical features\n",
    "        scaler = StandardScaler()\n",
    "        X_train[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])\n",
    "        X_test[numerical_cols] = scaler.transform(X_test[numerical_cols])\n",
    "        joblib.dump(scaler, HEART_SCALER_PATH)\n",
    "        print(f\"Scaler saved to {HEART_SCALER_PATH}\")\n",
    "\n",
    "        # --- 3. Train Model ---\n",
    "        print(\"\\nTraining RandomForestClassifier model...\")\n",
    "        model = RandomForestClassifier(n_estimators=100, random_state=42)\n",
    "        model.fit(X_train, y_train)\n",
    "        print(\"Model training complete.\")\n",
    "\n",
    "        # --- 4. Evaluate Model (Optional) ---\n",
    "        y_pred = model.predict(X_test)\n",
    "        accuracy = accuracy_score(y_test, y_pred)\n",
    "        print(f\"Model Accuracy on Test Set: {accuracy:.2f}\")\n",
    "\n",
    "        # --- 5. Save Model ---\n",
    "        joblib.dump(model, HEART_MODEL_PATH)\n",
    "        print(f\"Heart disease model saved to {HEART_MODEL_PATH}\")\n",
    "\n",
    "        print(\"\\nHeart disease model training and saving process complete!\")\n",
    "        print(\"You can now find the model artifacts in the 'model_artifacts' folder.\")\n",
    "        print(\"Next, we will update app.py and script.js to use this new model.\")\n",
    "    else:\n",
    "        print(\"\\nSkipping model training and saving due to empty dataset.\")\n",
    "else:\n",
    "    print(\"\\nDataset was not loaded. Skipping model training and saving.\")\n"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 9,
   "id": "5e9360dc-aaaf-40fa-91ea-50225c54a7d4",
   "metadata": {},
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "Imports, Configuration, and Directory Check Complete.\n"
     ]
    }
   ],
   "source": [
    "import pandas as pd\n",
    "import numpy as np\n",
    "from sklearn.model_selection import train_test_split, GridSearchCV # Added GridSearchCV\n",
    "from sklearn.preprocessing import StandardScaler\n",
    "from sklearn.ensemble import RandomForestClassifier\n",
    "from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix # Added more metrics\n",
    "import joblib\n",
    "import os\n",
    "import sys\n",
    "\n",
    "# --- Configuration ---\n",
    "# Path where the model artifacts will be saved\n",
    "MODEL_ARTIFACTS_DIR = 'model_artifacts'\n",
    "HEART_MODEL_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_model.joblib')\n",
    "HEART_SCALER_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_scaler.joblib')\n",
    "HEART_FEATURE_COLUMNS_PATH = os.path.join(MODEL_ARTIFACTS_DIR, 'heart_disease_feature_columns.joblib')\n",
    "\n",
    "# Ensure the model_artifacts directory exists\n",
    "os.makedirs(MODEL_ARTIFACTS_DIR, exist_ok=True)\n",
    "\n",
    "print(\"Imports, Configuration, and Directory Check Complete.\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 10,
   "id": "ffe9b939-7e8d-430d-bd9d-23040985d48b",
   "metadata": {},
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "Jupyter Notebook's current working directory: C:\\Users\\Gourav Rajput\\Diabetes_Prediction_Project\n",
      "Attempting to load heart disease dataset from: C:\\Users\\Gourav Rajput\\Diabetes_Prediction_Project\\cleveland.csv\n",
      "Dataset loaded successfully from 'cleveland.csv'.\n"
     ]
    }
   ],
   "source": [
    "print(f\"Jupyter Notebook's current working directory: {os.getcwd()}\")\n",
    "print(f\"Attempting to load heart disease dataset from: {os.path.join(os.getcwd(), 'cleveland.csv')}\")\n",
    "\n",
    "df = None # Initialize df to None\n",
    "\n",
    "try:\n",
    "    column_names = [\n",
    "        'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang',\n",
    "        'oldpeak', 'slope', 'ca', 'thal', 'target'\n",
    "    ]\n",
    "    df = pd.read_csv('cleveland.csv', header=None, names=column_names)\n",
    "    print(\"Dataset loaded successfully from 'cleveland.csv'.\")\n",
    "except FileNotFoundError:\n",
    "    print(f\"ERROR: 'cleveland.csv' not found at the expected path: {os.path.join(os.getcwd(), 'cleveland.csv')}\")\n",
    "    print(\"Please ensure you have downloaded the 'processed.cleveland.data' file from \")\n",
    "    print(\"[https://archive.ics.uci.edu/dataset/45/heart+disease](https://archive.ics.uci.edu/dataset/45/heart+disease) \")\n",
    "    print(\"and saved it as 'cleveland.csv' directly in your project directory (where your app.py is).\")\n",
    "except Exception as e:\n",
    "    print(f\"An unexpected error occurred while loading the dataset: {e}\")\n",
    "\n",
    "if df is None:\n",
    "    sys.exit(\"Dataset loading failed. Exiting script.\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 11,
   "id": "8cbcc227-428f-47f2-8ed9-fd9478bcdcb8",
   "metadata": {},
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "\n",
      "Starting data preprocessing...\n",
      "Dataframe has 298 rows after cleaning.\n",
      "Data preprocessing complete.\n"
     ]
    }
   ],
   "source": [
    "print(\"\\nStarting data preprocessing...\")\n",
    "if df is not None:\n",
    "    # Replace '?' with NaN for missing values\n",
    "    df = df.replace('?', np.nan)\n",
    "\n",
    "    # Convert all columns to numeric where possible, coercing errors to NaN\n",
    "    for col in df.columns:\n",
    "        df[col] = pd.to_numeric(df[col], errors='coerce')\n",
    "\n",
    "    # Drop rows with any missing values (NaNs introduced by 'coerce' or original '?')\n",
    "    df.dropna(inplace=True)\n",
    "\n",
    "    # After dropping rows, check if the DataFrame is still empty\n",
    "    if df.empty:\n",
    "        print(\"ERROR: DataFrame is empty after dropping rows with missing values. Check data quality.\")\n",
    "        sys.exit(\"Empty DataFrame after cleaning. Exiting script.\") # Exit if df is empty\n",
    "\n",
    "    print(f\"Dataframe has {len(df)} rows after cleaning.\")\n",
    "\n",
    "    # Define features (X) and target (y)\n",
    "    X = df.drop('target', axis=1)\n",
    "    y = df['target']\n",
    "\n",
    "    # Ensure target is binary (0 or 1 for presence of heart disease)\n",
    "    y = y.apply(lambda x: 1 if x > 0 else 0)\n",
    "\n",
    "    # One-hot encode categorical features\n",
    "    categorical_cols = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal']\n",
    "    categorical_cols = [col for col in categorical_cols if col in X.columns]\n",
    "\n",
    "    X_encoded = pd.get_dummies(X, columns=categorical_cols, drop_first=False)\n",
    "\n",
    "    # Identify numerical features for scaling\n",
    "    numerical_cols = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']\n",
    "    numerical_cols = [col for col in numerical_cols if col in X_encoded.columns]\n",
    "\n",
    "    print(\"Data preprocessing complete.\")\n",
    "else:\n",
    "    sys.exit(\"Preprocessing skipped as dataset was not loaded.\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 12,
   "id": "a701fa73-f619-4c93-957c-f53fdd2c257c",
   "metadata": {},
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "Feature columns saved to model_artifacts\\heart_disease_feature_columns.joblib\n",
      "Data split into training (238 samples) and testing (60 samples) sets.\n"
     ]
    }
   ],
   "source": [
    "# Save the list of feature columns AFTER encoding and before splitting\n",
    "heart_disease_feature_columns = X_encoded.columns.tolist()\n",
    "joblib.dump(heart_disease_feature_columns, HEART_FEATURE_COLUMNS_PATH)\n",
    "print(f\"Feature columns saved to {HEART_FEATURE_COLUMNS_PATH}\")\n",
    "\n",
    "# Split data into training and testing sets\n",
    "X_train, X_test, y_train, y_test = train_test_split(X_encoded, y, test_size=0.2, random_state=42, stratify=y)\n",
    "print(f\"Data split into training ({len(X_train)} samples) and testing ({len(X_test)} samples) sets.\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 13,
   "id": "15f8ab0b-3422-4146-aaca-ba7ace883f44",
   "metadata": {},
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "Scaler saved to model_artifacts\\heart_disease_scaler.joblib\n",
      "Numerical features scaled.\n"
     ]
    }
   ],
   "source": [
    "scaler = StandardScaler()\n",
    "X_train[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])\n",
    "X_test[numerical_cols] = scaler.transform(X_test[numerical_cols])\n",
    "joblib.dump(scaler, HEART_SCALER_PATH)\n",
    "print(f\"Scaler saved to {HEART_SCALER_PATH}\")\n",
    "print(\"Numerical features scaled.\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 15,
   "id": "2b703a97-6060-475c-8ebe-2dd2308f6ed8",
   "metadata": {},
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "\n",
      "Starting Hyperparameter Tuning for RandomForestClassifier...\n",
      "Fitting 5 folds for each of 216 candidates, totalling 1080 fits\n",
      "\n",
      "Hyperparameter tuning complete!\n",
      "Best parameters found: {'criterion': 'gini', 'max_depth': None, 'min_samples_leaf': 1, 'min_samples_split': 2, 'n_estimators': 200}\n",
      "Best cross-validation accuracy: 0.82\n"
     ]
    }
   ],
   "source": [
    "print(\"\\nStarting Hyperparameter Tuning for RandomForestClassifier...\")\n",
    "\n",
    "# Define the parameter grid to search\n",
    "param_grid = {\n",
    "    'n_estimators': [50, 100, 200], # Number of trees in the forest\n",
    "    'max_depth': [None, 10, 20, 30], # Maximum depth of the tree\n",
    "    'min_samples_split': [2, 5, 10], # Minimum number of samples required to split an internal node\n",
    "    'min_samples_leaf': [1, 2, 4], # Minimum number of samples required to be at a leaf node\n",
    "    'criterion': ['gini', 'entropy'] # Function to measure the quality of a split\n",
    "}\n",
    "\n",
    "# Initialize GridSearchCV\n",
    "# cv=5 means 5-fold cross-validation\n",
    "# n_jobs=-1 uses all available CPU cores\n",
    "# verbose=2 provides detailed output during the search\n",
    "grid_search = GridSearchCV(estimator=RandomForestClassifier(random_state=42),\n",
    "                           param_grid=param_grid,\n",
    "                           cv=5,\n",
    "                           n_jobs=-1,\n",
    "                           verbose=2,\n",
    "                           scoring='accuracy') # We are optimizing for accuracy\n",
    "\n",
    "# Perform the grid search on the training data\n",
    "grid_search.fit(X_train, y_train)\n",
    "\n",
    "# Get the best estimator (model) found by GridSearchCV\n",
    "best_model = grid_search.best_estimator_\n",
    "\n",
    "print(\"\\nHyperparameter tuning complete!\")\n",
    "print(f\"Best parameters found: {grid_search.best_params_}\")\n",
    "print(f\"Best cross-validation accuracy: {grid_search.best_score_:.2f}\")\n"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 16,
   "id": "ea793cda-84d7-4e68-94f7-29a2484cd06b",
   "metadata": {},
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "\n",
      "Evaluating the best model on the test set...\n",
      "Best Model Test Accuracy: 0.85\n",
      "Best Model Test Precision: 0.85\n",
      "Best Model Test Recall: 0.82\n",
      "Best Model Test F1-Score: 0.84\n",
      "Best Model Test ROC AUC Score: 0.94\n",
      "Confusion Matrix:\n",
      " [[28  4]\n",
      " [ 5 23]]\n",
      "\n",
      "Best heart disease model saved to model_artifacts\\heart_disease_model.joblib\n",
      "\n",
      "Heart disease model training and saving process complete!\n",
      "You can now find the best model artifacts in the 'model_artifacts' folder.\n",
      "Next, we will update app.py and script.js to integrate heart disease prediction.\n"
     ]
    }
   ],
   "source": [
    "print(\"\\nEvaluating the best model on the test set...\")\n",
    "y_pred_best = best_model.predict(X_test)\n",
    "accuracy_best = accuracy_score(y_test, y_pred_best)\n",
    "precision_best = precision_score(y_test, y_pred_best)\n",
    "recall_best = recall_score(y_test, y_pred_best)\n",
    "f1_best = f1_score(y_test, y_pred_best)\n",
    "roc_auc_best = roc_auc_score(y_test, best_model.predict_proba(X_test)[:, 1])\n",
    "conf_matrix_best = confusion_matrix(y_test, y_pred_best)\n",
    "\n",
    "\n",
    "print(f\"Best Model Test Accuracy: {accuracy_best:.2f}\")\n",
    "print(f\"Best Model Test Precision: {precision_best:.2f}\")\n",
    "print(f\"Best Model Test Recall: {recall_best:.2f}\")\n",
    "print(f\"Best Model Test F1-Score: {f1_best:.2f}\")\n",
    "print(f\"Best Model Test ROC AUC Score: {roc_auc_best:.2f}\")\n",
    "print(\"Confusion Matrix:\\n\", conf_matrix_best)\n",
    "\n",
    "\n",
    "# --- Save the Best Model ---\n",
    "joblib.dump(best_model, HEART_MODEL_PATH)\n",
    "print(f\"\\nBest heart disease model saved to {HEART_MODEL_PATH}\")\n",
    "\n",
    "print(\"\\nHeart disease model training and saving process complete!\")\n",
    "print(\"You can now find the best model artifacts in the 'model_artifacts' folder.\")\n",
    "print(\"Next, we will update app.py and script.js to integrate heart disease prediction.\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "dcfebe79-4e9d-4991-bae0-8e1bb08476d3",
   "metadata": {},
   "outputs": [],
   "source": []
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3 (ipykernel)",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "codemirror_mode": {
    "name": "ipython",
    "version": 3
   },
   "file_extension": ".py",
   "mimetype": "text/x-python",
   "name": "python",
   "nbconvert_exporter": "python",
   "pygments_lexer": "ipython3",
   "version": "3.10.0"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 5
}
