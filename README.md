# LIP-READ - Automated Lip Reading System

## Project Overview
This project aims to develop a deep learning based system that can read lips from video and convert it into text.

## Team Members
- Member Jiya - Data Collection & Preprocessing
- Member Param - Model Development & Backend
- Member Kanishka - Frontend & Documentation

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python, Flask
- Machine Learning: CNN, LSTM, OpenCV
- Tools: VS Code, Kaggle, GitHub

## Folder Structure
LIP-READ/
├── frontend/ (UI files)
├── backend/ (Flask API)
├── model/ (ML model)
├── data/ (dataset - not uploaded)
└── README.md

## Setup Instructions
1. Clone the repo - git clone https://github.com/param5205/LIP-READ.git
2. Install requirements - pip install -r requirements.txt
3. Run backend - python app.py
4. Open frontend/index.html in browser


## Backend (model + API)

The backend/ folder contains the lip reading model, training and testing scripts, prediction, live webcam mode and the Flask API.

Files
File	What it does
model.py	3D CNN + BiGRU lip reading model (CTC loss)
preprocess.py	Mouth cropping, preprocessing and decoding, shared by training and prediction
train.py	Trains the model and saves the best weights to lipreader.pt
test.py	Evaluates the model on the test split (CER and WER)
predict.py	Runs the trained model on a video
live.py	Real-time lip reading from a webcam
app.py	Flask API
Setup
cd backend
pip install -r requirements.txt

The first run downloads a small face landmark model (face_landmarker.task), so an internet connection is needed once.

Dataset format
backend/data/videos/clip001.mp4
backend/data/labels/clip001.txt    (the spoken sentence, lowercase text)

Each video needs a label file with the same name. The dataset and the trained weights are not stored in the repo.

Usage
python train.py                      # train the model
python test.py                       # evaluate on the test split
python predict.py path/to/video.mp4  # predict from one video
python live.py                       # live lip reading with the webcam
python app.py                        # start the API on port 5000
API
POST http://127.0.0.1:5000/predict
Send the video as form-data with the key video (mp4, webm, avi or mov, up to 20 MB)
Success: {"prediction": "text"}
Error: {"error": "message"} with status 400, 413, 422 or 500
Status

The code is complete, but the model is not trained yet because it needs the dataset.




## Current Status
Project in development phase.