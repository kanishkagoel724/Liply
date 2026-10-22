from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import tempfile
from predict import get_model, predict_video

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # pehle MAZ likha tha

ALLOWED_EXT = {".mp4", ".webm", ".avi", ".mov"}  # pehle EXR likha tha

get_model()

@app.get("/")
def health():
    return jsonify(status="ok")

@app.post("/predict")
def predict():
    # Frontend kabhi 'file' bhejta hai kabhi 'video', dono accept karo
    if "video" in request.files:
        file = request.files["video"]
    elif "file" in request.files:
        file = request.files["file"]
    else:
        return jsonify(error="Send the video as form-data with key 'video' or 'file'."), 400

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        return jsonify(error=f"Unsupported file type. Use one of {sorted(ALLOWED_EXT)}."), 400

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        file.save(tmp)
        path = tmp.name

    try:
        text = predict_video(path)
    except ValueError as e:
        return jsonify(error=str(e)), 422
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify(error="Internal error while processing the video."), 500
    finally:
        try:
            os.remove(path)
        except:
            pass

    return jsonify(prediction=text, text=text)

@app.errorhandler(413)
def too_large(_):
    return jsonify(error="File too large (max 20MB)"), 413

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
